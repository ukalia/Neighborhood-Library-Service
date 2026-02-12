from django.test import TestCase
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model
from users.permissions import IsLibrarian, IsLibrarianOrMemberReadOnly

User = get_user_model()


class IsLibrarianPermissionTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsLibrarian()
        self.librarian = User.objects.create_user(
            username='librarian',
            email='librarian@test.com',
            password='testpass123',
            role=User.LIBRARIAN
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@test.com',
            password='testpass123',
            role=User.MEMBER
        )

    def test_librarian_has_permission(self):
        """Test that librarians have permission"""
        request = self.factory.get('/')
        request.user = self.librarian

        has_permission = self.permission.has_permission(request, None)

        self.assertTrue(has_permission)

    def test_member_no_permission(self):
        """Test that members do not have permission"""
        request = self.factory.get('/')
        request.user = self.member

        has_permission = self.permission.has_permission(request, None)

        self.assertFalse(has_permission)


class IsLibrarianOrMemberReadOnlyPermissionTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsLibrarianOrMemberReadOnly()
        self.librarian = User.objects.create_user(
            username='librarian',
            email='librarian@test.com',
            password='testpass123',
            role=User.LIBRARIAN
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@test.com',
            password='testpass123',
            role=User.MEMBER
        )

    def test_librarian_can_write(self):
        """Test that librarians can write"""
        request = self.factory.post('/')
        request.user = self.librarian

        has_permission = self.permission.has_permission(request, None)

        self.assertTrue(has_permission)

    def test_member_can_read(self):
        """Test that members can read"""
        request = self.factory.get('/')
        request.user = self.member

        has_permission = self.permission.has_permission(request, None)

        self.assertTrue(has_permission)

    def test_member_cannot_write(self):
        """Test that members cannot write"""
        request = self.factory.post('/')
        request.user = self.member

        has_permission = self.permission.has_permission(request, None)

        self.assertFalse(has_permission)
