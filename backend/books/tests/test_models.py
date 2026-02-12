from django.test import TestCase
from django.db import IntegrityError
from books.models import BookCopy, Transaction, LibraryConfig
from books.tests.test_utils import TestDataFactory


class BookCopyModelTest(TestCase):
    def test_unique_barcode_constraint(self):
        """Test that barcodes must be unique"""
        TestDataFactory.create_book_copy(barcode='TEST001')

        with self.assertRaises(IntegrityError):
            TestDataFactory.create_book_copy(barcode='TEST001')

    def test_borrowed_status_requires_borrower(self):
        """Test that borrowed status requires a borrower"""
        member = TestDataFactory.create_member()
        copy = TestDataFactory.create_book_copy()

        copy.status = BookCopy.BORROWED
        copy.borrowed_by = member
        copy.save()

        self.assertEqual(copy.status, BookCopy.BORROWED)
        self.assertEqual(copy.borrowed_by, member)

    def test_available_status_no_borrower(self):
        """Test that available status should not have borrower"""
        copy = TestDataFactory.create_book_copy()

        self.assertEqual(copy.status, BookCopy.AVAILABLE)
        self.assertIsNone(copy.borrowed_by)

    def test_str_representation(self):
        """Test string representation"""
        book = TestDataFactory.create_book(title='Test Book')
        copy = TestDataFactory.create_book_copy(book=book, barcode='TEST001')

        self.assertEqual(str(copy), 'Test Book - TEST001')


class TransactionModelTest(TestCase):
    def test_create_transaction(self):
        """Test creating a transaction"""
        member = TestDataFactory.create_member()
        book_copy = TestDataFactory.create_book_copy()

        transaction = Transaction.objects.create(
            book_copy=book_copy,
            borrowed_by=member
        )

        self.assertIsNotNone(transaction.id)
        self.assertEqual(transaction.book_copy, book_copy)
        self.assertEqual(transaction.borrowed_by, member)
        self.assertIsNone(transaction.returned_at)
        self.assertIsNone(transaction.fine)
        self.assertFalse(transaction.fine_collected)

    def test_one_active_transaction_per_copy(self):
        """Test that only one active transaction per copy is allowed"""
        member = TestDataFactory.create_member()
        book_copy = TestDataFactory.create_book_copy()

        Transaction.objects.create(
            book_copy=book_copy,
            borrowed_by=member
        )

        with self.assertRaises(IntegrityError):
            Transaction.objects.create(
                book_copy=book_copy,
                borrowed_by=member
            )

    def test_str_representation(self):
        """Test string representation"""
        member = TestDataFactory.create_member(username='john')
        book = TestDataFactory.create_book(title='Test Book')
        copy = TestDataFactory.create_book_copy(book=book, barcode='TEST001')

        transaction = Transaction.objects.create(
            book_copy=copy,
            borrowed_by=member
        )

        self.assertIn('Test Book', str(transaction))
        self.assertIn('john', str(transaction))


class LibraryConfigModelTest(TestCase):
    def test_singleton_pattern(self):
        """Test that only one config instance exists"""
        config1 = LibraryConfig.get_instance()
        config2 = LibraryConfig.get_instance()

        self.assertEqual(config1.id, config2.id)
        self.assertEqual(LibraryConfig.objects.count(), 1)

    def test_default_values(self):
        """Test default configuration values"""
        config = LibraryConfig.get_instance()

        self.assertEqual(config.max_borrow_days_without_fine, 14)
        self.assertEqual(config.fine_per_day, 1.00)
        self.assertEqual(config.max_books_per_member, 3)

    def test_cannot_delete_config(self):
        """Test that config cannot be deleted"""
        config = LibraryConfig.get_instance()
        config.delete()

        self.assertEqual(LibraryConfig.objects.count(), 1)

    def test_str_representation(self):
        """Test string representation"""
        config = LibraryConfig.get_instance()

        self.assertIn('Library Config', str(config))
        self.assertIn('14', str(config))
