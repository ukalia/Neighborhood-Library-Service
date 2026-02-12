import logging
from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from books.models import BookCopy, Transaction, LibraryConfig
from books.services.exceptions import (
    BookNotAvailableException,
    BorrowLimitExceededException,
    DuplicateBorrowException,
    BookAlreadyReturnedException,
    MemberInactiveException
)

User = get_user_model()
logger = logging.getLogger(__name__)


class TransactionService:
    """Service for managing book borrowing and returns"""

    @staticmethod
    @transaction.atomic
    def issue_book(barcode: str, member_id: int, issued_by_librarian_id: int) -> Transaction:
        """
        Issue a book to a member

        Args:
            barcode: Book copy barcode
            member_id: Member ID
            issued_by_librarian_id: Librarian who issued the book

        Returns:
            Transaction object

        Raises:
            Various LibraryServiceException subclasses
        """
        logger.info(
            "Attempting to issue book",
            extra={
                'barcode': barcode,
                'member_id': member_id,
                'librarian_id': issued_by_librarian_id
            }
        )

        try:
            member = User.objects.get(id=member_id, role=User.MEMBER)
        except User.DoesNotExist:
            logger.error(f"Member not found", extra={'member_id': member_id})
            raise ValueError('Member not found')

        if not member.is_active:
            logger.warning(
                f"Attempted to issue book to inactive member",
                extra={'member_id': member_id, 'member': member.username}
            )
            raise MemberInactiveException('Member account is not active')

        try:
            book_copy = BookCopy.objects.select_related('book').get(barcode=barcode)
        except BookCopy.DoesNotExist:
            logger.error(f"Book copy not found", extra={'barcode': barcode})
            raise ValueError('Book copy not found')

        if book_copy.status != BookCopy.AVAILABLE:
            logger.warning(
                f"Book copy not available",
                extra={'barcode': barcode, 'status': book_copy.status}
            )
            raise BookNotAvailableException('Book copy is not available for borrowing')

        if book_copy.book.is_archived:
            logger.warning(
                f"Attempted to borrow archived book",
                extra={'barcode': barcode, 'book': book_copy.book.title}
            )
            raise BookNotAvailableException('This book is archived and cannot be borrowed')

        config = LibraryConfig.get_instance()
        active_borrows_count = member.active_borrowed_copies.filter(
            status=BookCopy.BORROWED
        ).count()

        if active_borrows_count >= config.max_books_per_member:
            logger.warning(
                f"Member exceeded borrow limit",
                extra={
                    'member_id': member_id,
                    'active_borrows': active_borrows_count,
                    'limit': config.max_books_per_member
                }
            )
            raise BorrowLimitExceededException(
                f'Member has reached the maximum borrow limit of {config.max_books_per_member} books'
            )

        duplicate_borrow = Transaction.objects.filter(
            borrowed_by=member,
            book_copy__book=book_copy.book,
            returned_at__isnull=True
        ).exists()

        if duplicate_borrow:
            logger.warning(
                f"Member already has this book borrowed",
                extra={'member_id': member_id, 'book': book_copy.book.title}
            )
            raise DuplicateBorrowException('Member already has a copy of this book borrowed')

        try:
            librarian = User.objects.get(id=issued_by_librarian_id, role=User.LIBRARIAN)
        except User.DoesNotExist:
            logger.error(f"Librarian not found", extra={'librarian_id': issued_by_librarian_id})
            raise ValueError('Librarian not found')

        new_transaction = Transaction.objects.create(
            book_copy=book_copy,
            borrowed_by=member,
            issued_by=librarian
        )

        book_copy.status = BookCopy.BORROWED
        book_copy.borrowed_by = member
        book_copy.save()

        logger.info(
            f"Book issued successfully",
            extra={
                'transaction_id': new_transaction.id,
                'barcode': barcode,
                'member_id': member_id,
                'book': book_copy.book.title
            }
        )

        return new_transaction

    @staticmethod
    @transaction.atomic
    def process_return(transaction_id: int) -> dict:
        """
        Process a book return and calculate fine

        Args:
            transaction_id: Transaction ID

        Returns:
            Dict with return details (fine, days_borrowed, etc.)

        Raises:
            BookAlreadyReturnedException: If book already returned
        """
        logger.info(
            f"Processing return",
            extra={'transaction_id': transaction_id}
        )

        try:
            txn = Transaction.objects.select_related('book_copy__book', 'borrowed_by').get(id=transaction_id)
        except Transaction.DoesNotExist:
            logger.error(f"Transaction not found", extra={'transaction_id': transaction_id})
            raise ValueError('Transaction not found')

        if txn.returned_at:
            logger.warning(
                f"Attempted to return already returned book",
                extra={'transaction_id': transaction_id}
            )
            raise BookAlreadyReturnedException('Book already returned')

        config = LibraryConfig.get_instance()
        days_borrowed = (timezone.now() - txn.created_at).days

        if days_borrowed > config.max_borrow_days_without_fine:
            overdue_days = days_borrowed - config.max_borrow_days_without_fine
            fine_amount = Decimal(overdue_days) * config.fine_per_day
        else:
            fine_amount = Decimal('0.00')

        txn.returned_at = timezone.now()
        txn.fine = fine_amount
        txn.save()

        book_copy = txn.book_copy
        book_copy.status = BookCopy.AVAILABLE
        book_copy.borrowed_by = None
        book_copy.save()

        logger.info(
            f"Return processed",
            extra={
                'transaction_id': transaction_id,
                'barcode': book_copy.barcode,
                'member_id': txn.borrowed_by.id,
                'days_borrowed': days_borrowed,
                'fine': str(fine_amount),
                'is_overdue': fine_amount > 0
            }
        )

        return {
            'transaction_id': txn.id,
            'fine': fine_amount,
            'days_borrowed': days_borrowed,
            'returned_at': txn.returned_at,
            'is_overdue': fine_amount > 0
        }

    @staticmethod
    def collect_fine(transaction_id: int) -> Transaction:
        """Mark fine as collected"""
        logger.info(
            f"Collecting fine",
            extra={'transaction_id': transaction_id}
        )

        try:
            txn = Transaction.objects.get(id=transaction_id)
        except Transaction.DoesNotExist:
            logger.error(f"Transaction not found", extra={'transaction_id': transaction_id})
            raise ValueError('Transaction not found')

        if not txn.fine or txn.fine == Decimal('0.00'):
            logger.warning(
                f"No fine to collect",
                extra={'transaction_id': transaction_id}
            )
            raise ValueError('No fine associated with this transaction')

        txn.fine_collected = True
        txn.save()

        logger.info(
            f"Fine collected",
            extra={'transaction_id': transaction_id, 'amount': str(txn.fine)}
        )

        return txn
