from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from books.models import Author, Book, BookCopy, Transaction, LibraryConfig

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    books_count = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = ('id', 'name', 'nationality', 'books_count', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_books_count(self, obj):
        return obj.books.count()


class BookSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    total_copies = serializers.SerializerMethodField()
    available_copies = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ('id', 'title', 'author', 'author_name', 'isbn', 'is_archived',
                  'total_copies', 'available_copies', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_total_copies(self, obj):
        return obj.copies.count()

    def get_available_copies(self, obj):
        return obj.copies.filter(status=BookCopy.AVAILABLE).count()


class BookCopyListSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author.name', read_only=True)
    borrower_name = serializers.CharField(source='borrowed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = BookCopy
        fields = ('id', 'barcode', 'book', 'book_title', 'book_author', 'status', 'borrowed_by', 'borrower_name')
        read_only_fields = ('id',)


class BookCopyDetailSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author.name', read_only=True)
    borrower_name = serializers.CharField(source='borrowed_by.username', read_only=True, allow_null=True)
    active_transaction = serializers.SerializerMethodField()

    class Meta:
        model = BookCopy
        fields = ('id', 'book', 'book_title', 'book_author', 'barcode', 'status',
                  'borrowed_by', 'borrower_name', 'active_transaction',
                  'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_active_transaction(self, obj):
        transaction = obj.transactions.filter(returned_at__isnull=True).first()
        if transaction:
            config = LibraryConfig.get_instance()
            borrowed_at = transaction.created_at
            due_date = borrowed_at + timedelta(days=config.max_borrow_days_without_fine)
            is_overdue = timezone.now() > due_date

            return {
                'id': transaction.id,
                'borrowed_at': borrowed_at,
                'due_date': due_date,
                'is_overdue': is_overdue,
                'days_borrowed': (timezone.now() - borrowed_at).days
            }
        return None


class BookCopySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookCopy
        fields = ('id', 'book', 'barcode', 'status', 'borrowed_by', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class TransactionSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book_copy.book.title', read_only=True)
    borrower_name = serializers.CharField(source='borrowed_by.username', read_only=True)
    barcode = serializers.CharField(source='book_copy.barcode', read_only=True)
    days_borrowed = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = ('id', 'book_copy', 'book_title', 'barcode', 'borrowed_by',
                  'borrower_name', 'created_at', 'returned_at', 'fine',
                  'fine_collected', 'days_borrowed', 'is_overdue', 'due_date', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_days_borrowed(self, obj):
        end_date = obj.returned_at or timezone.now()
        return (end_date - obj.created_at).days

    def get_due_date(self, obj):
        config = LibraryConfig.get_instance()
        return obj.created_at + timedelta(days=config.max_borrow_days_without_fine)

    def get_is_overdue(self, obj):
        if obj.returned_at:
            return False
        config = LibraryConfig.get_instance()
        due_date = obj.created_at + timedelta(days=config.max_borrow_days_without_fine)
        return timezone.now() > due_date


class LibraryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryConfig
        fields = ('id', 'max_borrow_days_without_fine', 'fine_per_day',
                  'max_books_per_member', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class BorrowRequestSerializer(serializers.Serializer):
    """Input validation for borrowing books"""
    barcode = serializers.CharField(max_length=128, required=True)
    member_id = serializers.IntegerField(required=False)
