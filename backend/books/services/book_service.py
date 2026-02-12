import logging
from books.models import BookCopy
from books.services.exceptions import BookNotAvailableException

logger = logging.getLogger(__name__)


class BookCopyService:
    """Service for managing book copy operations"""

    @staticmethod
    def mark_as_maintenance(book_copy: BookCopy) -> BookCopy:
        """Mark a book copy as out for maintenance"""
        if book_copy.status == BookCopy.BORROWED:
            logger.warning(
                f"Attempted to mark borrowed copy as maintenance",
                extra={'barcode': book_copy.barcode, 'status': book_copy.status}
            )
            raise BookNotAvailableException('Cannot mark borrowed copy as maintenance')

        logger.info(
            f"Marking copy as maintenance",
            extra={'barcode': book_copy.barcode, 'book': book_copy.book.title}
        )

        book_copy.status = BookCopy.MAINTENANCE
        book_copy.borrowed_by = None
        book_copy.save()

        return book_copy

    @staticmethod
    def mark_as_available(book_copy: BookCopy) -> BookCopy:
        """Mark a copy as available"""
        logger.info(
            f"Marking copy as available",
            extra={'barcode': book_copy.barcode}
        )

        book_copy.status = BookCopy.AVAILABLE
        book_copy.borrowed_by = None
        book_copy.save()

        return book_copy

    @staticmethod
    def mark_as_lost(book_copy: BookCopy) -> BookCopy:
        """Mark a copy as lost"""
        logger.warning(
            f"Marking copy as lost",
            extra={'barcode': book_copy.barcode, 'book': book_copy.book.title}
        )

        book_copy.status = BookCopy.LOST
        book_copy.save()

        return book_copy
