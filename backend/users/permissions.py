from rest_framework.permissions import BasePermission


class IsMember(BasePermission):
    """
    Permission class that allows only active members to access.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_borrow_books()
        )


class IsLibrarian(BasePermission):
    """
    Permission class that allows only librarians to access.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_manage_library()
        )


class IsLibrarianOrMemberReadOnly(BasePermission):
    """
    Allow librarians full access.
    Allow members read-only access (safe methods only).
    """
    def has_permission(self, request, view):
        from rest_framework import permissions

        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.can_manage_library():
            return True

        if request.user.can_borrow_books() and request.method in permissions.SAFE_METHODS:
            return True

        return False
