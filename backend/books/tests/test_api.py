from django.urls import reverse
from django.test import override_settings
from django.db import connection
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from books.models import BookCopy, Transaction, Author, Book
from books.tests.test_utils import TestDataFactory


class BorrowingAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.member = TestDataFactory.create_member()
        self.librarian = TestDataFactory.create_librarian()
        self.book_copy = TestDataFactory.create_book_copy()
        TestDataFactory.setup_library_config()

    def test_issue_book_as_librarian(self):
        """Test that librarians can issue books"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('transaction-issue-book')
        data = {
            'barcode': self.book_copy.barcode,
            'member_id': self.member.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['borrowed_by'], self.member.id)

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.BORROWED)

    def test_issue_book_as_member_forbidden(self):
        """Test that members cannot issue books"""
        self.client.force_authenticate(user=self.member)

        url = reverse('transaction-issue-book')
        data = {
            'barcode': self.book_copy.barcode,
            'member_id': self.member.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_issue_book_unauthenticated(self):
        """Test that unauthenticated users cannot issue books"""
        url = reverse('transaction-issue-book')
        data = {
            'barcode': self.book_copy.barcode,
            'member_id': self.member.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_issue_book_invalid_barcode(self):
        """Test issuing book with invalid barcode"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('transaction-issue-book')
        data = {
            'barcode': 'INVALID',
            'member_id': self.member.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_process_return(self):
        """Test book return processing"""
        self.client.force_authenticate(user=self.librarian)

        transaction = Transaction.objects.create(
            book_copy=self.book_copy,
            borrowed_by=self.member
        )
        self.book_copy.status = BookCopy.BORROWED
        self.book_copy.borrowed_by = self.member
        self.book_copy.save()

        url = reverse('transaction-process-return', args=[transaction.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('fine', response.data)
        self.assertIn('days_borrowed', response.data)

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.AVAILABLE)

    def test_process_return_already_returned(self):
        """Test that already returned book cannot be returned again"""
        self.client.force_authenticate(user=self.librarian)

        transaction = Transaction.objects.create(
            book_copy=self.book_copy,
            borrowed_by=self.member
        )

        url = reverse('transaction-process-return', args=[transaction.id])
        self.client.post(url)

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class BookCopyAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.librarian = TestDataFactory.create_librarian()
        self.member = TestDataFactory.create_member()
        self.book_copy = TestDataFactory.create_book_copy()

    def test_list_book_copies_as_librarian(self):
        """Test that librarians can list book copies"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('bookcopy-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)

    def test_list_book_copies_as_member_forbidden(self):
        """Test that members cannot list book copies"""
        self.client.force_authenticate(user=self.member)

        url = reverse('bookcopy-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_mark_maintenance(self):
        """Test marking book copy as maintenance"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('bookcopy-mark-maintenance', args=[self.book_copy.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.MAINTENANCE)

    def test_mark_available(self):
        """Test marking book copy as available"""
        self.client.force_authenticate(user=self.librarian)

        self.book_copy.status = BookCopy.MAINTENANCE
        self.book_copy.save()

        url = reverse('bookcopy-mark-available', args=[self.book_copy.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.book_copy.refresh_from_db()
        self.assertEqual(self.book_copy.status, BookCopy.AVAILABLE)

    def test_by_barcode(self):
        """Test looking up book copy by barcode"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('bookcopy-by-barcode')
        response = self.client.get(url, {'barcode': self.book_copy.barcode})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['barcode'], self.book_copy.barcode)


class BookAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.librarian = TestDataFactory.create_librarian()
        self.member = TestDataFactory.create_member()
        self.book = TestDataFactory.create_book()

    def test_list_books_as_member(self):
        """Test that members can list books"""
        self.client.force_authenticate(user=self.member)

        url = reverse('book-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_book_as_librarian(self):
        """Test that librarians can create books"""
        self.client.force_authenticate(user=self.librarian)

        author = TestDataFactory.create_author()
        url = reverse('book-list')
        data = {
            'title': 'New Book',
            'author': author.id,
            'isbn': '9876543210'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_book_as_member_forbidden(self):
        """Test that members cannot create books"""
        self.client.force_authenticate(user=self.member)

        author = TestDataFactory.create_author()
        url = reverse('book-list')
        data = {
            'title': 'New Book',
            'author': author.id,
            'isbn': '9876543210'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_archive_book(self):
        """Test archiving a book"""
        self.client.force_authenticate(user=self.librarian)

        url = reverse('book-archive', args=[self.book.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.book.refresh_from_db()
        self.assertTrue(self.book.is_archived)


class AuthorAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.librarian = TestDataFactory.create_librarian()

    def test_list_authors_as_librarian(self):
        """Test that librarians can list authors"""
        self.client.force_authenticate(user=self.librarian)

        TestDataFactory.create_author(name='Author 1')
        TestDataFactory.create_author(name='Author 2')

        url = reverse('author-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)

    def test_author_list_no_n_plus_one_queries(self):
        """Verify that author list endpoint doesn't have N+1 query issues"""
        self.client.force_authenticate(user=self.librarian)

        authors = []
        for i in range(10):
            author = TestDataFactory.create_author(name=f'Author {i}')
            authors.append(author)
            for j in range(3):
                TestDataFactory.create_book(
                    title=f'Book {i}-{j}',
                    author=author,
                    isbn=f'ISBN{i}{j}'
                )

        url = reverse('author-list')

        with self.assertNumQueries(2):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data['results']), 10)
            for author_data in response.data['results']:
                self.assertIn('books_count', author_data)
                self.assertEqual(author_data['books_count'], 3)


class BookQueryOptimizationTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.librarian = TestDataFactory.create_librarian()
        self.member = TestDataFactory.create_member()

    def test_book_list_no_n_plus_one_queries(self):
        """Verify that book list endpoint doesn't have N+1 query issues"""
        self.client.force_authenticate(user=self.member)

        author = TestDataFactory.create_author(name='Test Author')
        books = []
        for i in range(10):
            book = TestDataFactory.create_book(
                title=f'Book {i}',
                author=author,
                isbn=f'ISBN{i:03d}'
            )
            books.append(book)
            for j in range(3):
                status_val = BookCopy.AVAILABLE if j < 2 else BookCopy.BORROWED
                borrowed_by = self.member if status_val == BookCopy.BORROWED else None
                TestDataFactory.create_book_copy(
                    book=book,
                    barcode=f'BARCODE{i:03d}{j:03d}',
                    status=status_val,
                    borrowed_by=borrowed_by
                )

        url = reverse('book-list')

        with self.assertNumQueries(2):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data['results']), 10)
            for book_data in response.data['results']:
                self.assertIn('total_copies', book_data)
                self.assertIn('available_copies', book_data)
                self.assertEqual(book_data['total_copies'], 3)
                self.assertEqual(book_data['available_copies'], 2)
