from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from decimal import Decimal

from books.models import Author, Book, BookCopy, Transaction, LibraryConfig
from books.serializers import (
    AuthorSerializer,
    BookSerializer,
    BookCopySerializer,
    BookCopyListSerializer,
    BookCopyDetailSerializer,
    TransactionSerializer,
    LibraryConfigSerializer,
    BorrowRequestSerializer
)
from users.permissions import IsLibrarian, IsLibrarianOrMemberReadOnly

User = get_user_model()


class AuthorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing authors.
    Librarians can perform full CRUD operations on authors.
    """
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    permission_classes = [IsLibrarian]
    filterset_fields = ['nationality']
    search_fields = ['name', 'nationality']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class BookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing books.
    Supports archiving books (soft delete).
    Librarians: full CRUD access.
    Members: read-only access to catalog.
    """
    serializer_class = BookSerializer
    permission_classes = [IsLibrarianOrMemberReadOnly]
    filterset_fields = ['author', 'is_archived']
    search_fields = ['title', 'isbn', 'author__name']
    ordering_fields = ['title', 'created_at']
    ordering = ['title']

    def get_queryset(self):
        queryset = Book.objects.select_related('author').all()
        if self.action == 'unarchive':
            return queryset
        if not self.request.query_params.get('include_archived', False):
            queryset = queryset.filter(is_archived=False)
        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarian])
    def archive(self, request, pk=None):
        """Archive a book (sets is_archived=True). Librarians only."""
        book = self.get_object()
        book.is_archived = True
        book.save()
        return Response({'status': 'book archived'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarian])
    def unarchive(self, request, pk=None):
        """Unarchive a book. Librarians only."""
        book = self.get_object()
        book.is_archived = False
        book.save()
        return Response({'status': 'book unarchived'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def copies(self, request, pk=None):
        """Get all copies of a specific book with their status"""
        book = self.get_object()
        copies = book.copies.select_related('borrowed_by').all()
        serializer = BookCopyDetailSerializer(copies, many=True)
        return Response(serializer.data)


class BookCopyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual book copies.
    Handles barcode scanning, status changes, maintenance tracking.
    """
    queryset = BookCopy.objects.select_related('book', 'book__author', 'borrowed_by').all()
    serializer_class = BookCopySerializer
    permission_classes = [IsLibrarian]
    filterset_fields = ['status', 'book']
    search_fields = ['barcode', 'book__title']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return BookCopyListSerializer
        return BookCopyDetailSerializer

    @action(detail=True, methods=['post'])
    def mark_maintenance(self, request, pk=None):
        """Mark a copy as out for maintenance"""
        copy = self.get_object()

        if copy.status == BookCopy.BORROWED:
            return Response(
                {'error': 'Cannot mark borrowed copy as maintenance'},
                status=status.HTTP_400_BAD_REQUEST
            )

        copy.status = BookCopy.MAINTENANCE
        copy.borrowed_by = None
        copy.save()
        return Response({'status': 'marked for maintenance'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_available(self, request, pk=None):
        """Mark a copy as available (from maintenance)"""
        copy = self.get_object()
        copy.status = BookCopy.AVAILABLE
        copy.borrowed_by = None
        copy.save()
        return Response({'status': 'marked as available'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_lost(self, request, pk=None):
        """Mark a copy as lost"""
        copy = self.get_object()
        copy.status = BookCopy.LOST
        copy.save()
        return Response({'status': 'marked as lost'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def by_barcode(self, request):
        """Look up a copy by barcode (for scanner integration)"""
        barcode = request.query_params.get('barcode')
        if not barcode:
            return Response(
                {'error': 'barcode parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            copy = BookCopy.objects.select_related('book', 'book__author', 'borrowed_by').get(barcode=barcode)
            serializer = BookCopyDetailSerializer(copy)
            return Response(serializer.data)
        except BookCopy.DoesNotExist:
            return Response(
                {'error': 'Book copy not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and managing transactions.
    Read-only for list/retrieve, custom actions for returns and fines.
    Librarians: can view all transactions and process returns/fines.
    Members: can only view their own transactions (read-only).
    """
    queryset = Transaction.objects.select_related('book_copy__book', 'borrowed_by').all()
    serializer_class = TransactionSerializer
    permission_classes = [IsLibrarianOrMemberReadOnly]
    filterset_fields = ['borrowed_by', 'book_copy', 'fine_collected']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()

        if not self.request.user.can_manage_library():
            queryset = queryset.filter(borrowed_by=self.request.user)

        if self.request.query_params.get('active_only') == 'true':
            queryset = queryset.filter(returned_at__isnull=True)
        if self.request.query_params.get('overdue_only') == 'true':
            config = LibraryConfig.get_instance()
            cutoff_date = timezone.now() - timedelta(days=config.max_borrow_days_without_fine)
            queryset = queryset.filter(returned_at__isnull=True, created_at__lt=cutoff_date)
        return queryset

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarian], url_path='issue-book')
    @transaction.atomic
    def issue_book(self, request):
        """Issue a book to a member. Librarians only."""
        serializer = BorrowRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        barcode = serializer.validated_data['barcode']
        member_id = serializer.validated_data.get('member_id')

        if not member_id:
            return Response(
                {'error': 'member_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member = User.objects.get(id=member_id, role=User.MEMBER)
        except User.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not member.is_active:
            return Response(
                {'error': 'Member account is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            book_copy = BookCopy.objects.select_related('book').get(barcode=barcode)
        except BookCopy.DoesNotExist:
            return Response(
                {'error': 'Book copy not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if book_copy.status != BookCopy.AVAILABLE:
            return Response(
                {'error': 'Book copy is not available for borrowing'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if book_copy.book.is_archived:
            return Response(
                {'error': 'This book is archived and cannot be borrowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config = LibraryConfig.get_instance()
        active_borrows_count = member.active_borrowed_copies.filter(
            status=BookCopy.BORROWED
        ).count()

        if active_borrows_count >= config.max_books_per_member:
            return Response(
                {'error': f'Member has reached the maximum borrow limit of {config.max_books_per_member} books'},
                status=status.HTTP_400_BAD_REQUEST
            )

        duplicate_borrow = Transaction.objects.filter(
            borrowed_by=member,
            book_copy__book=book_copy.book,
            returned_at__isnull=True
        ).exists()

        if duplicate_borrow:
            return Response(
                {'error': 'Member already has a copy of this book borrowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_transaction = Transaction.objects.create(
            book_copy=book_copy,
            borrowed_by=member
        )

        book_copy.status = BookCopy.BORROWED
        book_copy.borrowed_by = member
        book_copy.save()

        transaction_serializer = TransactionSerializer(new_transaction)
        return Response(transaction_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarian])
    def process_return(self, request, pk=None):
        """
        Process a book return and calculate fine if applicable.
        Librarians only.
        """
        transaction = self.get_object()

        if transaction.returned_at:
            return Response(
                {'error': 'Book already returned'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config = LibraryConfig.get_instance()

        days_borrowed = (timezone.now() - transaction.created_at).days
        if days_borrowed > config.max_borrow_days_without_fine:
            overdue_days = days_borrowed - config.max_borrow_days_without_fine
            fine_amount = Decimal(overdue_days) * config.fine_per_day
        else:
            fine_amount = Decimal('0.00')

        transaction.returned_at = timezone.now()
        transaction.fine = fine_amount
        transaction.save()

        book_copy = transaction.book_copy
        book_copy.status = BookCopy.AVAILABLE
        book_copy.borrowed_by = None
        book_copy.save()

        return Response({
            'status': 'return processed',
            'fine': str(fine_amount),
            'days_borrowed': days_borrowed,
            'returned_at': transaction.returned_at
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarian])
    def collect_fine(self, request, pk=None):
        """Mark fine as collected. Librarians only."""
        transaction = self.get_object()

        if not transaction.fine or transaction.fine == Decimal('0.00'):
            return Response(
                {'error': 'No fine associated with this transaction'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transaction.fine_collected = True
        transaction.save()

        return Response({'status': 'fine collected'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get all overdue transactions"""
        config = LibraryConfig.get_instance()
        cutoff_date = timezone.now() - timedelta(days=config.max_borrow_days_without_fine)

        overdue_transactions = Transaction.objects.filter(
            returned_at__isnull=True,
            created_at__lt=cutoff_date
        ).select_related('book_copy__book', 'borrowed_by')

        serializer = self.get_serializer(overdue_transactions, many=True)
        return Response(serializer.data)


class BorrowingStatsViewSet(viewsets.GenericViewSet):
    """
    ViewSet for borrowing statistics and overview.
    """
    permission_classes = [IsLibrarian]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Get overall library borrowing statistics.
        """
        total_copies = BookCopy.objects.count()
        available_copies = BookCopy.objects.filter(status=BookCopy.AVAILABLE).count()
        borrowed_copies = BookCopy.objects.filter(status=BookCopy.BORROWED).count()
        maintenance_copies = BookCopy.objects.filter(status=BookCopy.MAINTENANCE).count()
        lost_copies = BookCopy.objects.filter(status=BookCopy.LOST).count()

        active_transactions = Transaction.objects.filter(returned_at__isnull=True).count()

        config = LibraryConfig.get_instance()
        cutoff_date = timezone.now() - timedelta(days=config.max_borrow_days_without_fine)
        overdue_count = Transaction.objects.filter(
            returned_at__isnull=True,
            created_at__lt=cutoff_date
        ).count()

        total_members = User.objects.filter(role=User.MEMBER).count()
        active_borrowers = User.objects.filter(
            active_borrowed_copies__status=BookCopy.BORROWED
        ).distinct().count()

        return Response({
            'copies': {
                'total': total_copies,
                'available': available_copies,
                'borrowed': borrowed_copies,
                'maintenance': maintenance_copies,
                'lost': lost_copies
            },
            'transactions': {
                'active': active_transactions,
                'overdue': overdue_count
            },
            'members': {
                'total': total_members,
                'active_borrowers': active_borrowers
            }
        })

    @action(detail=False, methods=['get'])
    def popular_books(self, request):
        """Get most borrowed books"""
        popular = Book.objects.annotate(
            borrow_count=Count('copies__transactions')
        ).select_related('author').order_by('-borrow_count')[:10]

        data = [{
            'book_id': book.id,
            'title': book.title,
            'author': book.author.name,
            'borrow_count': book.borrow_count
        } for book in popular]

        return Response(data)


class LibraryConfigViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing library configuration.
    Singleton pattern - only one config instance exists.
    """
    permission_classes = [IsLibrarian]
    serializer_class = LibraryConfigSerializer

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current library configuration"""
        config = LibraryConfig.get_instance()
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_config(self, request):
        """Update library configuration"""
        config = LibraryConfig.get_instance()
        serializer = self.get_serializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
