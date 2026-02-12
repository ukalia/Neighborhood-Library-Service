import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS, { buildUrl } from "@/app/lib/api/endpoints";
import type {
  Book,
  BookCopy,
  BookQueryParams,
  CreateBookRequest,
  UpdateBookRequest,
  ArchiveBookResponse,
  PaginatedResponse,
} from "@/app/types/library";

/**
 * Get list of books with optional query parameters
 */
export const getBooks = async (params?: BookQueryParams): Promise<Book[]> => {
  const response = await apiClient.get<PaginatedResponse<Book>>(
    buildUrl(API_ENDPOINTS.BOOKS.LIST, params)
  );
  return response.results;
};

/**
 * Get paginated list of books with optional query parameters
 */
export interface PaginatedBookQueryParams extends BookQueryParams {
  page?: number;
  page_size?: number;
}

export const getBooksPaginated = async (
  params?: PaginatedBookQueryParams
): Promise<PaginatedResponse<Book>> => {
  return apiClient.get<PaginatedResponse<Book>>(
    buildUrl(API_ENDPOINTS.BOOKS.LIST, params)
  );
};

/**
 * Get a single book by ID
 */
export const getBookById = async (id: number): Promise<Book> => {
  return apiClient.get<Book>(API_ENDPOINTS.BOOKS.DETAIL(id));
};

/**
 * Create a new book (Librarian only)
 */
export const createBook = async (data: CreateBookRequest): Promise<Book> => {
  return apiClient.post<Book>(API_ENDPOINTS.BOOKS.LIST, data);
};

/**
 * Update an existing book (Librarian only)
 */
export const updateBook = async (
  id: number,
  data: UpdateBookRequest
): Promise<Book> => {
  return apiClient.patch<Book>(API_ENDPOINTS.BOOKS.DETAIL(id), data);
};

/**
 * Delete a book (Librarian only)
 * Note: Will fail if book has existing copies
 */
export const deleteBook = async (id: number): Promise<void> => {
  return apiClient.delete<void>(API_ENDPOINTS.BOOKS.DETAIL(id));
};

/**
 * Archive a book (Librarian only)
 */
export const archiveBook = async (id: number): Promise<ArchiveBookResponse> => {
  return apiClient.post<ArchiveBookResponse>(API_ENDPOINTS.BOOKS.ARCHIVE(id));
};

/**
 * Unarchive a book (Librarian only)
 */
export const unarchiveBook = async (
  id: number
): Promise<ArchiveBookResponse> => {
  return apiClient.post<ArchiveBookResponse>(API_ENDPOINTS.BOOKS.UNARCHIVE(id));
};

/**
 * Get all copies of a specific book
 */
export const getBookCopies = async (id: number): Promise<BookCopy[]> => {
  return apiClient.get<BookCopy[]>(API_ENDPOINTS.BOOKS.COPIES(id));
};
