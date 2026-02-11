// Book Copy Status
export type BookCopyStatus = "available" | "borrowed" | "lost" | "maintenance";

// Author Type
export interface Author {
  id: number;
  name: string;
  nationality: string;
  books_count: number;
  created_at: string;
  updated_at: string;
}

// Book Type
export interface Book {
  id: number;
  title: string;
  author: number;
  author_name: string;
  isbn: string;
  is_archived: boolean;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
}

// Active Transaction Summary (nested in BookCopy)
export interface ActiveTransactionSummary {
  id: number;
  borrowed_at: string;
  due_date: string;
  is_overdue: boolean;
  days_borrowed: number;
}

// Book Copy Type
export interface BookCopy {
  id: number;
  book: number;
  book_title: string;
  book_author: string;
  barcode: string;
  status: BookCopyStatus;
  borrowed_by: number | null;
  borrower_name: string | null;
  active_transaction: ActiveTransactionSummary | null;
  created_at: string;
  updated_at: string;
}

// Transaction Type
export interface Transaction {
  id: number;
  book_copy: number;
  book_title: string;
  barcode: string;
  borrowed_by: number;
  borrower_name: string;
  created_at: string;
  returned_at: string | null;
  fine: string | null;
  fine_collected: boolean;
  days_borrowed: number;
  is_overdue: boolean;
  due_date: string;
  updated_at: string;
}

// Member Type
export interface Member {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
  is_active: boolean;
  date_joined: string;
  active_borrows_count: number;
  total_borrows_count: number;
}

// Library Configuration Type
export interface LibraryConfig {
  id: number;
  max_borrow_days_without_fine: number;
  fine_per_day: string;
  max_books_per_member: number;
  created_at: string;
  updated_at: string;
}

// Statistics Types
export interface LibraryOverview {
  copies: {
    total: number;
    available: number;
    borrowed: number;
    maintenance: number;
    lost: number;
  };
  transactions: {
    active: number;
    overdue: number;
  };
  members: {
    total: number;
    active_borrowers: number;
  };
}

export interface PopularBook {
  book_id: number;
  title: string;
  author: string;
  borrow_count: number;
}

// API Request Types
export interface BorrowBookRequest {
  barcode: string;
}

export interface LibrarianBorrowBookRequest {
  barcode: string;
  member_id: number;
}

export interface CreateBookRequest {
  title: string;
  author: number;
  isbn: string;
}

export interface UpdateBookRequest {
  title?: string;
  author?: number;
  isbn?: string;
}

export interface CreateAuthorRequest {
  name: string;
  nationality: string;
}

export interface UpdateAuthorRequest {
  name?: string;
  nationality?: string;
}

export interface CreateMemberRequest {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
}

export interface UpdateMemberRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: string;
}

export interface CreateBookCopyRequest {
  book: number;
  barcode: string;
  status: BookCopyStatus;
}

export interface UpdateBookCopyRequest {
  barcode?: string;
  status?: BookCopyStatus;
}

export interface UpdateLibraryConfigRequest {
  max_borrow_days_without_fine?: number;
  fine_per_day?: string;
  max_books_per_member?: number;
}

// API Response Types
export interface ProcessReturnResponse {
  status: string;
  fine: string;
  days_borrowed: number;
  returned_at: string;
}

export interface CollectFineResponse {
  status: string;
}

export interface ArchiveBookResponse {
  status: string;
}

export interface DeactivateMemberResponse {
  status: string;
}

export interface ActivateMemberResponse {
  status: string;
}

export interface MarkMaintenanceResponse {
  status: string;
}

export interface MarkAvailableResponse {
  status: string;
}

export interface MarkLostResponse {
  status: string;
}

// Query Parameters Types
export interface BookQueryParams {
  search?: string;
  author?: number;
  is_archived?: boolean;
  ordering?: "title" | "created_at" | "-title" | "-created_at";
}

export interface AuthorQueryParams {
  search?: string;
  nationality?: string;
  ordering?: "name" | "created_at";
}

export interface MemberQueryParams {
  search?: string;
  is_active?: boolean;
  ordering?: string;
}

export interface BookCopyQueryParams {
  search?: string;
  status?: BookCopyStatus;
  book?: number;
}

export interface TransactionQueryParams {
  borrowed_by?: number;
  book_copy?: number;
  fine_collected?: boolean;
  active_only?: boolean;
  overdue_only?: boolean;
}
