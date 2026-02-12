import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
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
from books.services import (
    TransactionService,
    BookCopyService,
    BookNotAvailableException,
    BorrowLimitExceededException,
    DuplicateBorrowException,
    BookAlreadyReturnedException,
    MemberInactiveException
)
from users.permissions import IsLibrarian, IsLibrarianOrMemberReadOnly

User = get_user_model()
logger = logging.getLogger(__name__)


class AuthorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing authors.
    Librarians can perform full CRUD operations on authors.
    """
    serializer_class = AuthorSerializer
    permission_classes = [IsLibrarian]
    filterset_fields = ['nationality']
    search_fields = ['name', 'nationality']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Author.objects.annotate(
            books_count=Count('books')
        )


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
        queryset = Book.objects.select_related('author').annotate(
            total_copies=Count('copies'),
            available_copies=Count(
                'copies',
                filter=Q(copies__status=BookCopy.AVAILABLE)
            )
        )
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

        try:
            BookCopyService.mark_as_maintenance(copy)
            return Response({'status': 'marked for maintenance'}, status=status.HTTP_200_OK)
        except BookNotAvailableException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error marking copy as maintenance", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def mark_available(self, request, pk=None):
        """Mark a copy as available (from maintenance)"""
        copy = self.get_object()

        try:
            BookCopyService.mark_as_available(copy)
            return Response({'status': 'marked as available'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Unexpected error marking copy as available", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def mark_lost(self, request, pk=None):
        """Mark a copy as lost"""
        copy = self.get_object()

        try:
            BookCopyService.mark_as_lost(copy)
            return Response({'status': 'marked as lost'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Unexpected error marking copy as lost", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    search_fields = ['book_copy__book__title', 'book_copy__barcode', 'borrowed_by__username', 'borrowed_by__first_name', 'borrowed_by__last_name']
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
            transaction_obj = TransactionService.issue_book(
                barcode=barcode,
                member_id=member_id,
                issued_by_librarian_id=request.user.id
            )

            transaction_serializer = TransactionSerializer(transaction_obj)
            return Response(transaction_serializer.data, status=status.HTTP_201_CREATED)

        except BorrowLimitExceededException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except DuplicateBorrowException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except BookNotAvailableException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except MemberInactiveException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Unexpected error issuing book", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarian])
    def process_return(self, request, pk=None):
        """
        Process a book return and calculate fine if applicable.
        Librarians only.
        """
        try:
            result = TransactionService.process_return(transaction_id=pk)
            return Response({
                'status': 'return processed',
                'fine': str(result['fine']),
                'days_borrowed': result['days_borrowed'],
                'returned_at': result['returned_at']
            }, status=status.HTTP_200_OK)

        except BookAlreadyReturnedException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Unexpected error processing return", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarian])
    def collect_fine(self, request, pk=None):
        """Mark fine as collected. Librarians only."""
        try:
            TransactionService.collect_fine(transaction_id=pk)
            return Response({'status': 'fine collected'}, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error collecting fine", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
