class LibraryServiceException(Exception):
    """Base exception for library service errors"""
    pass


class BookNotAvailableException(LibraryServiceException):
    """Raised when book is not available for borrowing"""
    pass


class BorrowLimitExceededException(LibraryServiceException):
    """Raised when member has reached borrow limit"""
    pass


class DuplicateBorrowException(LibraryServiceException):
    """Raised when member tries to borrow duplicate book"""
    pass


class BookAlreadyReturnedException(LibraryServiceException):
    """Raised when trying to return already returned book"""
    pass


class MemberInactiveException(LibraryServiceException):
    """Raised when member account is not active"""
    pass
