from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTest(TestCase):
    def test_create_member(self):
        """Test creating a member user"""
        user = User.objects.create_user(
            username='testmember',
            email='member@test.com',
            password='testpass123',
            role=User.MEMBER
        )

        self.assertEqual(user.username, 'testmember')
        self.assertEqual(user.role, User.MEMBER)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)

    def test_create_librarian(self):
        """Test creating a librarian user"""
        user = User.objects.create_user(
            username='testlibrarian',
            email='librarian@test.com',
            password='testpass123',
            role=User.LIBRARIAN
        )

        self.assertEqual(user.username, 'testlibrarian')
        self.assertEqual(user.role, User.LIBRARIAN)
        self.assertTrue(user.is_active)

    def test_can_manage_library_member(self):
        """Test that members cannot manage library"""
        user = User.objects.create_user(
            username='member',
            email='member@test.com',
            password='testpass123',
            role=User.MEMBER
        )

        self.assertFalse(user.can_manage_library())

    def test_can_manage_library_librarian(self):
        """Test that librarians can manage library"""
        user = User.objects.create_user(
            username='librarian',
            email='librarian@test.com',
            password='testpass123',
            role=User.LIBRARIAN
        )

        self.assertTrue(user.can_manage_library())

    def test_str_representation(self):
        """Test string representation"""
        user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )

        self.assertEqual(str(user), 'testuser (Member)')
