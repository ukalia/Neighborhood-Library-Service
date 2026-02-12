from django.test import TestCase
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from core.pagination import CustomPageNumberPagination
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomPageNumberPaginationTestCase(TestCase):
    """
    Test cases for CustomPageNumberPagination class
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.pagination = CustomPageNumberPagination()

        # Create test users
        self.users = [
            User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com',
                password='testpass123',
                role=User.MEMBER
            )
            for i in range(50)
        ]

    def test_default_page_size(self):
        """Test that default page size is used when not specified"""
        django_request = self.factory.get('/api/test/')
        request = Request(django_request)
        queryset = User.objects.all()

        result = self.pagination.paginate_queryset(queryset, request)

        self.assertEqual(len(result), 20)
        self.assertEqual(self.pagination.page.paginator.count, 50)

    def test_custom_page_size(self):
        """Test that custom page size is respected"""
        django_request = self.factory.get('/api/test/?page_size=10')
        request = Request(django_request)
        queryset = User.objects.all()

        result = self.pagination.paginate_queryset(queryset, request)

        self.assertEqual(len(result), 10)
        self.assertEqual(self.pagination.page.paginator.count, 50)

    def test_max_page_size_limit(self):
        """Test that page size cannot exceed max_page_size"""
        django_request = self.factory.get('/api/test/?page_size=200')
        request = Request(django_request)
        queryset = User.objects.all()

        result = self.pagination.paginate_queryset(queryset, request)

        # Should be limited to max_page_size (100)
        self.assertLessEqual(len(result), 100)

    def test_out_of_range_page_returns_empty(self):
        """Test that requesting page beyond available returns empty results"""
        django_request = self.factory.get('/api/test/?page=100&page_size=10')
        request = Request(django_request)
        queryset = User.objects.all()

        result = self.pagination.paginate_queryset(queryset, request)

        self.assertEqual(len(result), 0)
        self.assertIsNotNone(result)

    def test_pagination_metadata(self):
        """Test that pagination response includes correct metadata"""
        django_request = self.factory.get('/api/test/?page=2&page_size=10')
        request = Request(django_request)
        queryset = User.objects.all()

        result = self.pagination.paginate_queryset(queryset, request)
        response = self.pagination.get_paginated_response([])

        self.assertEqual(response.data['count'], 50)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNotNone(response.data['previous'])
        self.assertIn('results', response.data)

    def test_first_page_no_previous(self):
        """Test that first page has no previous link"""
        django_request = self.factory.get('/api/test/?page=1&page_size=10')
        request = Request(django_request)
        queryset = User.objects.all()

        self.pagination.paginate_queryset(queryset, request)
        response = self.pagination.get_paginated_response([])

        self.assertIsNone(response.data['previous'])
        self.assertIsNotNone(response.data['next'])

    def test_last_page_no_next(self):
        """Test that last page has no next link"""
        django_request = self.factory.get('/api/test/?page=5&page_size=10')
        request = Request(django_request)
        queryset = User.objects.all()

        self.pagination.paginate_queryset(queryset, request)
        response = self.pagination.get_paginated_response([])

        self.assertIsNotNone(response.data['previous'])
        self.assertIsNone(response.data['next'])

    def test_single_page_no_pagination_links(self):
        """Test that single page result has no next/previous links"""
        django_request = self.factory.get('/api/test/?page_size=100')
        request = Request(django_request)
        queryset = User.objects.all()

        self.pagination.paginate_queryset(queryset, request)
        response = self.pagination.get_paginated_response([])

        self.assertIsNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_empty_queryset(self):
        """Test pagination with empty queryset"""
        django_request = self.factory.get('/api/test/')
        request = Request(django_request)
        queryset = User.objects.none()

        result = self.pagination.paginate_queryset(queryset, request)
        response = self.pagination.get_paginated_response([])

        self.assertEqual(len(result), 0)
        self.assertEqual(response.data['count'], 0)
        self.assertIsNone(response.data['next'])
        self.assertIsNone(response.data['previous'])
