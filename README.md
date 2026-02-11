# Neighborhood Library Service

A Django-based library management system for neighborhood libraries, providing book inventory management, user role-based access, and transaction tracking.

## Tech Stack

- **Backend**: Django 5.2.11
- **Database**: PostgreSQL
- **ORM**: Django ORM

## Database Models

### Architecture Overview

The project consists of 3 main Django applications:
- **core**: Base model definitions
- **users**: Custom user authentication with role-based access
- **books**: Library inventory and transaction management

### Model Hierarchy

```
BaseModel (Abstract)
├── Author
├── Book
├── BookCopy
└── Transaction

AbstractUser
└── User
```

---

## Core Models

### BaseModel
**File**: [backend/core/models.py](backend/core/models.py)

Abstract base class providing common fields for all models.

**Fields**:
- `id` (BigAutoField) - Primary key
- `created_at` (DateTimeField) - Auto-populated on creation
- `updated_at` (DateTimeField) - Auto-updated on save

---

## User Models

### User
**File**: [backend/users/models.py](backend/users/models.py)
**Table**: `users`

Custom user model extending Django's AbstractUser with role-based access control.

**Fields**:
- Inherits: `id`, `password`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `is_superuser`, `last_login`, `date_joined`
- `role` (CharField) - 'member' or 'librarian' (default: 'member')
- `phone_number` (CharField, optional) - Max 15 characters
- `address` (TextField, optional) - User's address
- `groups` (ManyToMany) - Django auth groups
- `user_permissions` (ManyToMany) - Django permissions

**Indexes**:
- `role`
- `email`

**Methods**:
- `is_member` (property) - Returns True if role is 'member'
- `is_librarian` (property) - Returns True if role is 'librarian'
- `can_borrow_books()` - Returns True if user is active member
- `can_manage_library()` - Returns True if user is active librarian or superuser

**Relationships**:
- One-to-Many with [BookCopy](#bookcopy) (via `borrowed_by`)
- One-to-Many with [Transaction](#transaction) (via `borrowed_by`)

---

## Book Models

### Author
**File**: [backend/books/models.py](backend/books/models.py)
**Table**: `authors`

Stores author information.

**Fields**:
- `id` (BigAutoField) - Primary key
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)
- `name` (CharField) - Author's full name (max 256 characters)
- `nationality` (CharField, optional) - Max 128 characters

**Relationships**:
- One-to-Many with [Book](#book)

---

### Book
**File**: [backend/books/models.py](backend/books/models.py)
**Table**: `books`

Represents book titles in the library catalog.

**Fields**:
- `id` (BigAutoField) - Primary key
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)
- `title` (CharField) - Book title (max 256 characters)
- `isbn` (CharField, optional) - ISBN number (max 20 characters)
- `is_archived` (BooleanField) - Default: False
- `author` (ForeignKey) - References [Author](#author), PROTECT on delete

**Indexes**:
- `title`
- `author`

**Relationships**:
- Many-to-One with [Author](#author)
- One-to-Many with [BookCopy](#bookcopy)

---

### BookCopy
**File**: [backend/books/models.py](backend/books/models.py)
**Table**: `book_copies`

Represents individual physical copies of books with tracking.

**Fields**:
- `id` (BigAutoField) - Primary key
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)
- `status` (CharField) - 'available', 'borrowed', or 'lost' (default: 'available')
- `barcode` (CharField) - Unique identifier (max 128 characters)
- `book` (ForeignKey) - References [Book](#book), PROTECT on delete
- `borrowed_by` (ForeignKey, optional) - References [User](#user), PROTECT on delete

**Indexes**:
- `barcode` (unique)
- `borrowed_by`
- Composite: `book` + `status`

**Constraints**:
- `copy_status_borrower_constraint` (CheckConstraint):
  - Available copies must have no borrower
  - Borrowed copies must have a borrower
  - Lost copies can exist without constraint

**Relationships**:
- Many-to-One with [Book](#book)
- Many-to-One with [User](#user) (optional, when borrowed)
- One-to-Many with [Transaction](#transaction)

---

### Transaction
**File**: [backend/books/models.py](backend/books/models.py)
**Table**: `book_transactions`

Records book borrowing and return history.

**Fields**:
- `id` (BigAutoField) - Primary key
- `created_at` (DateTimeField) - When book was borrowed
- `updated_at` (DateTimeField) - Last update timestamp
- `book_copy` (ForeignKey) - References [BookCopy](#bookcopy), PROTECT on delete
- `borrowed_by` (ForeignKey) - References [User](#user), PROTECT on delete
- `returned_at` (DateTimeField, optional) - Null until book is returned
- `fine` (DecimalField, optional) - Fine amount (max 7 digits, 2 decimal places)

**Indexes**:
- `book_copy`
- `borrowed_by`

**Constraints**:
- `one_active_transaction_per_copy` (UniqueConstraint):
  - Only one active transaction (where `returned_at IS NULL`) per book copy
  - Prevents duplicate concurrent borrows

**Relationships**:
- Many-to-One with [BookCopy](#bookcopy)
- Many-to-One with [User](#user)

---

## Entity Relationship Diagram

```
┌─────────────┐
│   Author    │
│─────────────│
│ id          │
│ name        │
│ nationality │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────┐
│    Book     │
│─────────────│
│ id          │
│ title       │
│ isbn        │
│ is_archived │
│ author_id   │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────────┐         ┌──────────────┐
│   BookCopy      │◄────────│     User     │
│─────────────────│  N   1  │──────────────│
│ id              │borrowed │ id           │
│ barcode         │   _by   │ username     │
│ status          │         │ role         │
│ book_id         │         │ email        │
│ borrowed_by_id  │         │ phone_number │
└──────┬──────────┘         │ address      │
       │ 1                  └──────┬───────┘
       │                           │
       │ N                         │ 1
       │                           │
       │                           │ N
┌──────▼──────────────┐            │
│    Transaction      │────────────┘
│─────────────────────│
│ id                  │
│ book_copy_id        │
│ borrowed_by_id      │
│ returned_at         │
│ fine                │
└─────────────────────┘
```

---

## Database Integrity Features

### Foreign Key Protection
All foreign keys use `on_delete=PROTECT` to prevent accidental data loss:
- Cannot delete an Author with existing Books
- Cannot delete a Book with existing BookCopies
- Cannot delete a BookCopy with existing Transactions
- Cannot delete a User with active borrowed copies or transactions

### Business Logic Constraints

1. **BookCopy Status Consistency** (`copy_status_borrower_constraint`):
   - Ensures status field matches borrower state
   - Prevents invalid states like borrowed copies without borrowers

2. **Transaction Uniqueness** (`one_active_transaction_per_copy`):
   - Only one active (unreturned) transaction per book copy
   - Prevents duplicate concurrent borrows

### Audit Trail
All models include `created_at` and `updated_at` timestamps for complete audit history.

---

## Role-Based Access

### Member Role
- Can browse library catalog
- Can borrow available books
- Can view their transaction history
- Permission check: `user.can_borrow_books()`

### Librarian Role
- All member permissions
- Can manage book inventory
- Can manage authors
- Can process book returns
- Can apply fines
- Permission check: `user.can_manage_library()`

---

## Installation & Setup

### Prerequisites
- Docker and Docker Compose

### Running with Docker

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Neighborhood-Library-Service
   ```

2. Create a `.env` file with the following variables:
   ```env
   POSTGRES_DB=library
   POSTGRES_USER=library_user
   POSTGRES_PASSWORD=your_secure_password
   DJANGO_SECRET_KEY=your_secret_key
   ```

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

4. The application will automatically:
   - Wait for PostgreSQL to be ready
   - Run database migrations
   - Load test data (if database is empty)
   - Start backend (port 8000) and frontend (port 3000)

### Test Data

When the container starts for the first time, it automatically loads test data from `backend/fixtures/test_data.json`.

**Test Users**:
| Username | Password | Role |
|----------|----------|------|
| librarian1 | password123 | Librarian |
| librarian2 | password123 | Librarian |
| member1 | password123 | Member |
| member2 | password123 | Member |
| member3 | password123 | Member |
| member4 | password123 | Member |
| member5 | password123 | Member |

**Test Data Includes**:
- 10 books from classic literature
- 10 authors
- 50 book copies (5 copies per book)
- 15 historical transactions
  - Mix of completed and active transactions
  - Some with fines (collected and uncollected)
  - Some without fines (returned on time)
- 2 currently borrowed books
- Library configuration (14-day loan period, $1/day fine)

**Note**: Test data is only loaded if the database is empty. To reload test data:
1. Stop the containers: `docker-compose down`
2. Remove the database volume: `docker volume rm neighborhood-library-service_postgres_data`
3. Restart: `docker-compose up`

---

## API Documentation

### Interactive Documentation

The API provides interactive documentation powered by OpenAPI 3.0:

- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **ReDoc**: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **OpenAPI Schema**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

### Authentication

The API uses JWT (JSON Web Token) authentication. To access protected endpoints:

1. **Login** to get access and refresh tokens
2. **Include the access token** in the `Authorization` header: `Bearer <access_token>`
3. **Refresh the token** when it expires (15-minute lifetime)

**Token Lifetimes**:
- Access Token: 15 minutes
- Refresh Token: 1 day

### Base URL

```
http://localhost:8000/api/
```

### API Endpoints Overview

#### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/auth/login/` | Login and get JWT tokens | Public |
| POST | `/auth/refresh/` | Refresh access token | Public |
| POST | `/auth/logout/` | Logout and blacklist token | Authenticated |

**Login Request Body**:
```json
{
  "username": "member1",
  "password": "password123"
}
```

**Login Response**:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "member1",
    "email": "member1@example.com",
    "role": "member"
  }
}
```

---

#### Members (`/api/members/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/members/` | List all members | Librarian |
| POST | `/members/` | Create new member | Librarian |
| GET | `/members/{id}/` | Get member details | Librarian |
| PUT/PATCH | `/members/{id}/` | Update member | Librarian |
| DELETE | `/members/{id}/` | Delete member | Librarian |
| GET | `/members/me/` | Get current member profile | Member |
| POST | `/members/{id}/activate/` | Activate member | Librarian |
| POST | `/members/{id}/deactivate/` | Deactivate member | Librarian |
| GET | `/members/borrowing-history/` | Get member's borrowing history | Librarian or Member (own) |
| GET | `/members/active-borrows/` | Get member's active borrows | Librarian or Member (own) |

**Query Parameters**:
- `member_id` (optional): Specific member ID (librarian only)

---

#### Authors (`/api/authors/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/authors/` | List all authors | Authenticated |
| POST | `/authors/` | Create new author | Librarian |
| GET | `/authors/{id}/` | Get author details | Authenticated |
| PUT/PATCH | `/authors/{id}/` | Update author | Librarian |
| DELETE | `/authors/{id}/` | Delete author | Librarian |

**Author Object**:
```json
{
  "id": 1,
  "name": "F. Scott Fitzgerald",
  "nationality": "American",
  "books_count": 5
}
```

---

#### Books (`/api/books/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/books/` | List all books | Authenticated |
| POST | `/books/` | Create new book | Librarian |
| GET | `/books/{id}/` | Get book details | Authenticated |
| PUT/PATCH | `/books/{id}/` | Update book | Librarian |
| DELETE | `/books/{id}/` | Delete book | Librarian |
| POST | `/books/{id}/archive/` | Archive book | Librarian |
| POST | `/books/{id}/unarchive/` | Unarchive book | Librarian |
| GET | `/books/{id}/copies/` | List all copies of book | Authenticated |

**Book Object**:
```json
{
  "id": 1,
  "title": "The Great Gatsby",
  "isbn": "978-0-7432-7356-5",
  "author": {
    "id": 1,
    "name": "F. Scott Fitzgerald"
  },
  "is_archived": false,
  "total_copies": 5,
  "available_copies": 3
}
```

---

#### Book Copies (`/api/book-copies/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/book-copies/` | List all book copies | Librarian |
| POST | `/book-copies/` | Create new copy | Librarian |
| GET | `/book-copies/{id}/` | Get copy details | Librarian |
| PUT/PATCH | `/book-copies/{id}/` | Update copy | Librarian |
| DELETE | `/book-copies/{id}/` | Delete copy | Librarian |
| POST | `/book-copies/{id}/mark_available/` | Mark copy as available | Librarian |
| POST | `/book-copies/{id}/mark_maintenance/` | Mark copy for maintenance | Librarian |
| POST | `/book-copies/{id}/mark_lost/` | Mark copy as lost | Librarian |
| GET | `/book-copies/by_barcode/` | Lookup by barcode | Librarian |

**Query Parameters**:
- `barcode`: Barcode to search (required for `by_barcode` endpoint)

**BookCopy Statuses**:
- `available`: Available for borrowing
- `borrowed`: Currently borrowed
- `lost`: Marked as lost
- `maintenance`: Under maintenance

**BookCopy Object**:
```json
{
  "id": 1,
  "barcode": "GG-001",
  "status": "available",
  "book": {
    "id": 1,
    "title": "The Great Gatsby"
  },
  "borrowed_by": null
}
```

---

#### Transactions (`/api/transactions/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/transactions/` | List transactions | Librarian (all) or Member (own) |
| GET | `/transactions/{id}/` | Get transaction details | Librarian or Member (own) |
| POST | `/transactions/issue-book/` | Issue book to member | Librarian |
| POST | `/transactions/{id}/process_return/` | Process book return | Librarian |
| POST | `/transactions/{id}/collect_fine/` | Collect fine | Librarian |
| GET | `/transactions/overdue/` | List overdue transactions | Librarian |

**Issue Book Request**:
```json
{
  "book_copy_id": 1,
  "member_id": 5
}
```

**Transaction Object**:
```json
{
  "id": 1,
  "book_copy": {
    "id": 1,
    "barcode": "GG-001",
    "book": {
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald"
    }
  },
  "borrowed_by": {
    "id": 5,
    "username": "member1",
    "email": "member1@example.com"
  },
  "borrowed_at": "2026-02-01T10:00:00Z",
  "due_date": "2026-02-15T10:00:00Z",
  "returned_at": null,
  "fine": "0.00",
  "fine_collected": false,
  "is_overdue": false,
  "days_overdue": 0
}
```

**Business Rules**:
- Members can borrow up to 3 books simultaneously
- Loan period: 14 days (configurable)
- Fine: $1.00 per day overdue (configurable)
- Cannot borrow archived books
- Cannot borrow same title twice concurrently
- Member must be active to borrow

---

#### Borrowing Statistics (`/api/borrowing-stats/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/borrowing-stats/overview/` | Library overview statistics | Librarian |
| GET | `/borrowing-stats/popular_books/` | Most borrowed books | Librarian |

**Overview Response**:
```json
{
  "total_members": 15,
  "active_members": 12,
  "total_books": 10,
  "total_copies": 50,
  "available_copies": 38,
  "borrowed_copies": 12,
  "total_transactions": 157,
  "active_transactions": 12,
  "overdue_transactions": 2,
  "total_fines_pending": "45.00"
}
```

**Popular Books Response**:
```json
[
  {
    "book": {
      "id": 1,
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald"
    },
    "borrow_count": 23
  },
  {
    "book": {
      "id": 2,
      "title": "To Kill a Mockingbird",
      "author": "Harper Lee"
    },
    "borrow_count": 19
  }
]
```

---

#### Library Configuration (`/api/library-config/`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/library-config/current/` | Get current configuration | Librarian |
| PATCH | `/library-config/update_config/` | Update configuration | Librarian |

**Configuration Object**:
```json
{
  "id": 1,
  "borrow_limit": 3,
  "loan_period_days": 14,
  "fine_per_day": "1.00"
}
```

---

### Error Responses

The API uses standard HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `204 No Content`: Request succeeded with no content to return
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Response Format**:
```json
{
  "detail": "Error message describing what went wrong"
}
```

**Validation Error Format**:
```json
{
  "field_name": [
    "Error message for this field"
  ]
}
```

---

### Pagination

List endpoints return paginated results:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/books/?page=2",
  "previous": null,
  "results": [
    { ... }
  ]
}
```

---

### Filtering and Search

Many endpoints support filtering via query parameters. Refer to the interactive documentation for specific filter options available for each endpoint.

---

## Contributing

*(Add your contributing guidelines here)*

---

## License

*(Add your license information here)*