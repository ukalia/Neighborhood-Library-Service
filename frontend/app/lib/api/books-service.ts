import { apiClient } from "@/app/lib/api-client";
import type {
  Book,
  BookCopy,
  BookQueryParams,
  CreateBookRequest,
  UpdateBookRequest,
  ArchiveBookResponse,
} from "@/app/types/library";

/**
 * Get list of books with optional query parameters
 */
export const getBooks = async (params?: BookQueryParams): Promise<Book[]> => {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : "";

  const endpoint = queryString ? `/api/books/?${queryString}` : "/api/books/";
  return apiClient.get<Book[]>(endpoint);
};

/**
 * Get a single book by ID
 */
export const getBookById = async (id: number): Promise<Book> => {
  return apiClient.get<Book>(`/api/books/${id}/`);
};

/**
 * Create a new book (Librarian only)
 */
export const createBook = async (data: CreateBookRequest): Promise<Book> => {
  return apiClient.post<Book>("/api/books/", data);
};

/**
 * Update an existing book (Librarian only)
 */
export const updateBook = async (
  id: number,
  data: UpdateBookRequest
): Promise<Book> => {
  return apiClient.patch<Book>(`/api/books/${id}/`, data);
};

/**
 * Delete a book (Librarian only)
 * Note: Will fail if book has existing copies
 */
export const deleteBook = async (id: number): Promise<void> => {
  return apiClient.delete<void>(`/api/books/${id}/`);
};

/**
 * Archive a book (Librarian only)
 */
export const archiveBook = async (id: number): Promise<ArchiveBookResponse> => {
  return apiClient.post<ArchiveBookResponse>(`/api/books/${id}/archive/`);
};

/**
 * Unarchive a book (Librarian only)
 */
export const unarchiveBook = async (
  id: number
): Promise<ArchiveBookResponse> => {
  return apiClient.post<ArchiveBookResponse>(`/api/books/${id}/unarchive/`);
};

/**
 * Get all copies of a specific book
 */
export const getBookCopies = async (id: number): Promise<BookCopy[]> => {
  return apiClient.get<BookCopy[]>(`/api/books/${id}/copies/`);
};
