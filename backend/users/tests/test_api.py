from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class AuthenticationAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.member = User.objects.create_user(
            username='testmember',
            email='member@test.com',
            password='testpass123',
            role=User.MEMBER
        )
        self.librarian = User.objects.create_user(
            username='testlibrarian',
            email='librarian@test.com',
            password='testpass123',
            role=User.LIBRARIAN
        )

    def test_login_success(self):
        """Test successful login"""
        url = reverse('auth-login')
        data = {
            'username': 'testmember',
            'password': 'testpass123'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        url = reverse('auth-login')
        data = {
            'username': 'testmember',
            'password': 'wrongpassword'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token(self):
        """Test token refresh"""
        url = reverse('auth-login')
        data = {
            'username': 'testmember',
            'password': 'testpass123'
        }

        response = self.client.post(url, data, format='json')
        refresh_token = response.data['refresh']

        refresh_url = reverse('auth-refresh')
        refresh_data = {'refresh': refresh_token}

        response = self.client.post(refresh_url, refresh_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class MemberAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.librarian = User.objects.create_user(
            username='testlibrarian',
            email='librarian@test.com',
            password='testpass123',
            role=User.LIBRARIAN
        )
        self.member = User.objects.create_user(
            username='testmember',
            email='member@test.com',
            password='testpass123',
            role=User.MEMBER
        )

    def test_list_members_as_librarian(self):
        """Test that librarians can list members"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('member-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_members_as_member_forbidden(self):
        """Test that members cannot list members"""
        self.client.force_authenticate(user=self.member)

        url = reverse('member-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_member_as_librarian(self):
        """Test that librarians can create members"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('member-list')
        data = {
            'username': 'newmember',
            'email': 'newmember@test.com',
            'first_name': 'New',
            'last_name': 'Member'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
