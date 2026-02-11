# Neighborhood Library Service

## Overview

A full-stack library management system for neighborhood libraries that enables librarians to manage book inventory and members to browse and borrow books. The system provides role-based access control, transaction tracking, fine management, and comprehensive borrowing statistics.

## Tech Stack

### Backend
- **Framework**: Django 5.1.7
- **Database**: PostgreSQL 15
- **ORM**: Django ORM
- **Authentication**: JWT (djangorestframework-simplejwt 5.5.1)
- **API Documentation**: drf-spectacular 0.27.2

### Frontend
- **Framework**: Next.js 14.2.35
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.1
- **UI Library**: React 18

## Setup Steps

### Prerequisites
- Docker

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ukalia/Neighborhood-Library-Service.git
   cd Neighborhood-Library-Service
   ```

2. Create a `.env` file in the project root with the following configuration:
   ```env
   # POSTGRES IMAGE
   POSTGRES_DB=library
   POSTGRES_USER=library_user
   POSTGRES_PASSWORD=library_password

   # DB
   DB_NAME=library
   DB_USER=library_user
   DB_PASSWORD=library_password
   DB_HOST=db
   DB_PORT=5432

   # DJANGO
   DJANGO_SECRET_KEY=dev-secret
   DJANGO_DEBUG=1
   ```

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

4. The application will be available at:
   - **Backend API**: http://localhost:8000
   - **Frontend**: http://localhost:3000
   - **API Documentation**: http://localhost:8000/api/docs/

### Test Data Loading

The system automatically loads test data on first startup when `LOAD_FIXTURES=true` is set (enabled by default in docker-compose.yml).

**Test data is loaded only if the database is empty.** The fixture file is located at `backend/fixtures/test_data.json`.

**Test Users:**

| Username | Password | Role | Email |
|----------|----------|------|-------|
| librarian1 | password123 | Librarian | librarian1@library.com |
| librarian2 | password123 | Librarian | librarian2@library.com |
| member1 | password123 | Member | member1@example.com |
| member2 | password123 | Member | member2@example.com |
| member3 | password123 | Member | member3@example.com |
| member4 | password123 | Member | member4@example.com |
| member5 | password123 | Member | member5@example.com |

**Test Data Includes:**
- 10 books from classic literature
- 10 authors
- 50 book copies (5 copies per book)
- 15 historical transactions (mix of completed and active)
- Library configuration (14-day loan period, $1/day fine, 3 book limit)

**To reload test data:**
```bash
docker-compose down
docker volume rm neighborhood-library-service_postgres_data
docker-compose up
```

## Model Architecture

### BaseModel (Abstract)
- `id` (BigAutoField, Primary Key)
- `created_at` (DateTimeField, auto_now_add)
- `updated_at` (DateTimeField, auto_now)

### User (extends AbstractUser)
**Table**: `users`

**Fields:**
- Inherits all fields from AbstractUser (id, username, password, email, first_name, last_name, is_staff, is_active, is_superuser, last_login, date_joined)
- `role` (CharField) - 'member' or 'librarian', default: 'member'
- `phone_number` (CharField, max 15, nullable)
- `address` (TextField, nullable)

**Indexes:** role, email

**Relationships:**
- One-to-Many with BookCopy (via borrowed_by)
- One-to-Many with Transaction (via borrowed_by)

### Author (extends BaseModel)
**Table**: `authors`

**Fields:**
- `name` (CharField, max 256)
- `nationality` (CharField, max 128, nullable)

**Relationships:**
- One-to-Many with Book

### Book (extends BaseModel)
**Table**: `books`

**Fields:**
- `title` (CharField, max 256)
- `isbn` (CharField, max 20, nullable)
- `is_archived` (BooleanField, default: False)
- `author` (ForeignKey to Author, PROTECT)

**Indexes:** title, author

**Relationships:**
- Many-to-One with Author
- One-to-Many with BookCopy

### BookCopy (extends BaseModel)
**Table**: `book_copies`

**Fields:**
- `status` (CharField) - 'available', 'borrowed', 'lost', or 'maintenance', default: 'available'
- `barcode` (CharField, max 128, unique)
- `book` (ForeignKey to Book, PROTECT)
- `borrowed_by` (ForeignKey to User, PROTECT, nullable)

**Indexes:** barcode (unique), borrowed_by, (book, status)

**Constraints:**
- `copy_status_borrower_constraint`: Available copies must have no borrower; borrowed copies must have a borrower

**Relationships:**
- Many-to-One with Book
- Many-to-One with User (when borrowed)
- One-to-Many with Transaction

### Transaction (extends BaseModel)
**Table**: `book_transactions`

**Fields:**
- `book_copy` (ForeignKey to BookCopy, PROTECT)
- `borrowed_by` (ForeignKey to User, PROTECT)
- `returned_at` (DateTimeField, nullable)
- `fine` (DecimalField, max_digits=7, decimal_places=2, nullable)
- `fine_collected` (BooleanField, default: False)

**Indexes:** book_copy, borrowed_by, fine_collected

**Constraints:**
- `one_active_transaction_per_copy`: Only one active transaction (returned_at IS NULL) per book copy

**Relationships:**
- Many-to-One with BookCopy
- Many-to-One with User

### LibraryConfig (extends BaseModel)
**Table**: `library_config`

**Fields:**
- `max_borrow_days_without_fine` (IntegerField, default: 14)
- `fine_per_day` (DecimalField, max_digits=5, decimal_places=2, default: 1.00)
- `max_books_per_member` (IntegerField, default: 3)

**Note:** Singleton model (only one instance allowed)

## Allowed Librarian Actions

Librarians have full administrative access to manage the library system through the following UI pages:

### Dashboard
- View library overview statistics (total books, active borrows, overdue items, etc.)
- Quick issue books to members (by barcode and member selection)
- Quick process book returns (by barcode)

### Member Management
- View all members (with filters for active/inactive status)
- Create new member accounts
- Update member information
- Activate/deactivate member accounts
- View individual member details including borrowing history and active borrows
- Search members by username, email, or name

### Author Management
- Create, view, update, and delete authors
- Search authors by name or nationality

### Book Management
- Create, view, update, and delete books
- Archive/unarchive books
- Search books by title, author, or ISBN
- Filter books to show/hide archived books
- Navigate to view all copies of a specific book

### Book Copy Management
- Create, view, update, and delete book copies
- Mark copies as available, lost, or maintenance
- Search copies by barcode or book title
- Filter copies by status (available, borrowed, maintenance, lost)

### Transaction Management
- Issue books to members
- Process book returns
- View all transactions with filters (all, active, overdue, returned)
- Collect fines from returned transactions
- Search transactions by book title, barcode, or member name

## Allowed Member Actions

Members have limited access focused on browsing books and viewing their account information through the following UI pages:

### Dashboard
- View welcome message and profile summary
- View count of active borrows
- View books due soon (within 3 days)

### Browse Books
- Browse all non-archived books in the catalog
- View book details (title, author, ISBN, availability status)
- Search books by title, author, or ISBN

### My Borrows
- View all currently borrowed books
- See due dates for each borrowed book
- View overdue status

### History
- View complete borrowing history
- See past transactions and return dates

**Note:** Members cannot borrow or return books themselves. All book transactions (issuing and returning) must be performed by librarians.

### Borrowing Constraints

When librarians issue books to members, the following business rules apply:
- Members can borrow up to 3 books simultaneously
- Loan period is 14 days before fines accrue
- Members cannot borrow archived books
- Members cannot borrow the same title twice concurrently
- Members must have an active account to borrow books

## API Documentation

Interactive API documentation is available at:

**Swagger UI**: http://localhost:8000/api/docs/

**Additional documentation formats:**
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/
