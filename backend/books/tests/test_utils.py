from django.contrib.auth import get_user_model
from books.models import Author, Book, BookCopy, LibraryConfig
from decimal import Decimal

User = get_user_model()


class TestDataFactory:
    """Factory for creating test data"""

    @staticmethod
    def create_member(username='testmember', email='member@test.com', is_active=True):
        return User.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            role=User.MEMBER,
            is_active=is_active
        )

    @staticmethod
    def create_librarian(username='testlibrarian', email='librarian@test.com'):
        return User.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            role=User.LIBRARIAN
        )

    @staticmethod
    def create_author(name='Test Author', nationality='USA'):
        return Author.objects.create(name=name, nationality=nationality)

    @staticmethod
    def create_book(title='Test Book', author=None, isbn='1234567890', is_archived=False):
        if author is None:
            author = TestDataFactory.create_author()
        return Book.objects.create(title=title, author=author, isbn=isbn, is_archived=is_archived)

    @staticmethod
    def create_book_copy(book=None, barcode='TEST001', status=BookCopy.AVAILABLE, borrowed_by=None):
        if book is None:
            book = TestDataFactory.create_book()
        return BookCopy.objects.create(
            book=book,
            barcode=barcode,
            status=status,
            borrowed_by=borrowed_by
        )

    @staticmethod
    def setup_library_config(max_days=14, fine_per_day=Decimal('1.00'), max_books=3):
        config, created = LibraryConfig.objects.get_or_create(
            pk=1,
            defaults={
                'max_borrow_days_without_fine': max_days,
                'fine_per_day': fine_per_day,
                'max_books_per_member': max_books
            }
        )
        if not created:
            config.max_borrow_days_without_fine = max_days
            config.fine_per_day = fine_per_day
            config.max_books_per_member = max_books
            config.save()
        return config
