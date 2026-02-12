from django.test import TestCase
from django.db import DatabaseError
from decimal import Decimal
from unittest import mock
from books.services import (
    TransactionService,
    BookCopyService,
    BorrowLimitExceededException,
    DuplicateBorrowException,
    MemberInactiveException,
    BookNotAvailableException,
    BookAlreadyReturnedException
)
from books.tests.test_utils import TestDataFactory
from books.models import BookCopy, Transaction


class TransactionServiceTest(TestCase):
    def setUp(self):
        self.member = TestDataFactory.create_member()
        self.librarian = TestDataFactory.create_librarian()
        self.book_copy = TestDataFactory.create_book_copy()
        TestDataFactory.setup_library_config()

    def test_issue_book_success(self):
        """Test successful book issue"""
        transaction = TransactionService.issue_book(
            barcode=self.book_copy.barcode,
            member_id=self.member.id,
            issued_by_librarian_id=self.librarian.id
        )

        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.borrowed_by, self.member)
        self.assertEqual(transaction.book_copy, self.book_copy)
        self.assertEqual(transaction.issued_by, self.librarian)

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.BORROWED)
        self.assertEqual(self.book_copy.borrowed_by, self.member)

    def test_issue_book_to_inactive_member(self):
        """Test that inactive members cannot borrow"""
        self.member.is_active = False
        self.member.save()

        with self.assertRaises(MemberInactiveException):
            TransactionService.issue_book(
                barcode=self.book_copy.barcode,
                member_id=self.member.id,
                issued_by_librarian_id=self.librarian.id
            )

    def test_issue_book_exceeds_limit(self):
        """Test borrow limit enforcement"""
        Transaction.objects.create(book_copy=self.book_copy, borrowed_by=self.member)
        self.book_copy.status = BookCopy.BORROWED
        self.book_copy.borrowed_by = self.member
        self.book_copy.save()

        for i in range(2, 4):
            copy = TestDataFactory.create_book_copy(barcode=f'TEST00{i}')
            Transaction.objects.create(book_copy=copy, borrowed_by=self.member)
            copy.status = BookCopy.BORROWED
            copy.borrowed_by = self.member
            copy.save()

        new_copy = TestDataFactory.create_book_copy(barcode='TEST004')

        with self.assertRaises(BorrowLimitExceededException):
            TransactionService.issue_book(
                barcode=new_copy.barcode,
                member_id=self.member.id,
                issued_by_librarian_id=self.librarian.id
            )

    def test_issue_duplicate_book(self):
        """Test that member cannot borrow duplicate book"""
        TransactionService.issue_book(
            barcode=self.book_copy.barcode,
            member_id=self.member.id,
            issued_by_librarian_id=self.librarian.id
        )

        another_copy = TestDataFactory.create_book_copy(
            book=self.book_copy.book,
            barcode='TEST002'
        )

        with self.assertRaises(DuplicateBorrowException):
            TransactionService.issue_book(
                barcode=another_copy.barcode,
                member_id=self.member.id,
                issued_by_librarian_id=self.librarian.id
            )

    def test_issue_book_not_available(self):
        """Test that borrowed book cannot be issued"""
        self.book_copy.status = BookCopy.BORROWED
        self.book_copy.borrowed_by = self.member
        self.book_copy.save()

        with self.assertRaises(BookNotAvailableException):
            TransactionService.issue_book(
                barcode=self.book_copy.barcode,
                member_id=self.member.id,
                issued_by_librarian_id=self.librarian.id
            )

    def test_issue_archived_book(self):
        """Test that archived books cannot be borrowed"""
        self.book_copy.book.is_archived = True
        self.book_copy.book.save()

        with self.assertRaises(BookNotAvailableException):
            TransactionService.issue_book(
                barcode=self.book_copy.barcode,
                member_id=self.member.id,
                issued_by_librarian_id=self.librarian.id
            )

    def test_process_return_no_fine(self):
        """Test return within due date (no fine)"""
        transaction = TransactionService.issue_book(
            barcode=self.book_copy.barcode,
            member_id=self.member.id,
            issued_by_librarian_id=self.librarian.id
        )

        result = TransactionService.process_return(transaction.id)

        self.assertEqual(result['fine'], Decimal('0.00'))
        self.assertFalse(result['is_overdue'])

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.AVAILABLE)
        self.assertIsNone(self.book_copy.borrowed_by)

    def test_process_return_already_returned(self):
        """Test that already returned book cannot be returned again"""
        transaction = TransactionService.issue_book(
            barcode=self.book_copy.barcode,
            member_id=self.member.id,
            issued_by_librarian_id=self.librarian.id
        )

        TransactionService.process_return(transaction.id)

        with self.assertRaises(BookAlreadyReturnedException):
            TransactionService.process_return(transaction.id)

    def test_process_return_rollback_on_error(self):
        """Verify transaction rollback if book_copy update fails"""
        transaction = TransactionService.issue_book(
            barcode=self.book_copy.barcode,
            member_id=self.member.id,
            issued_by_librarian_id=self.librarian.id
        )

        with mock.patch.object(BookCopy, 'save', side_effect=DatabaseError('Simulated DB error')):
            with self.assertRaises(DatabaseError):
                TransactionService.process_return(transaction.id)

        transaction.refresh_from_db()
        self.assertIsNone(transaction.returned_at)
        self.assertIsNone(transaction.fine)

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.BORROWED)
        self.assertEqual(self.book_copy.borrowed_by, self.member)

    def test_collect_fine_success(self):
        """Test fine collection"""
        transaction = Transaction.objects.create(
            book_copy=self.book_copy,
            borrowed_by=self.member,
            fine=Decimal('5.00')
        )

        result = TransactionService.collect_fine(transaction.id)

        self.assertTrue(result.fine_collected)

    def test_collect_fine_no_fine(self):
        """Test that fine cannot be collected when there is no fine"""
        transaction = Transaction.objects.create(
            book_copy=self.book_copy,
            borrowed_by=self.member
        )

        with self.assertRaises(ValueError):
            TransactionService.collect_fine(transaction.id)


class BookCopyServiceTest(TestCase):
    def setUp(self):
        self.book_copy = TestDataFactory.create_book_copy()
        self.member = TestDataFactory.create_member()

    def test_mark_as_maintenance(self):
        """Test marking book as maintenance"""
        result = BookCopyService.mark_as_maintenance(self.book_copy)

        self.assertEqual(result.status, BookCopy.MAINTENANCE)
        self.assertIsNone(result.borrowed_by)

    def test_mark_borrowed_as_maintenance_fails(self):
        """Test that borrowed book cannot be marked as maintenance"""
        self.book_copy.status = BookCopy.BORROWED
        self.book_copy.borrowed_by = self.member
        self.book_copy.save()

        with self.assertRaises(BookNotAvailableException):
            BookCopyService.mark_as_maintenance(self.book_copy)

    def test_mark_as_available(self):
        """Test marking book as available"""
        self.book_copy.status = BookCopy.MAINTENANCE
        self.book_copy.save()

        result = BookCopyService.mark_as_available(self.book_copy)

        self.assertEqual(result.status, BookCopy.AVAILABLE)
        self.assertIsNone(result.borrowed_by)

    def test_mark_as_lost(self):
        """Test marking book as lost"""
        result = BookCopyService.mark_as_lost(self.book_copy)

        self.assertEqual(result.status, BookCopy.LOST)
