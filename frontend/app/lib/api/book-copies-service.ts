import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS, { buildUrl } from "@/app/lib/api/endpoints";
import type {
  BookCopy,
  BookCopyQueryParams,
  CreateBookCopyRequest,
  UpdateBookCopyRequest,
  MarkMaintenanceResponse,
  MarkAvailableResponse,
  MarkLostResponse,
  PaginatedResponse,
} from "@/app/types/library";

/**
 * Get list of book copies with optional query parameters (Librarian only)
 */
export const getBookCopies = async (
  params?: BookCopyQueryParams
): Promise<BookCopy[]> => {
  const response = await apiClient.get<PaginatedResponse<BookCopy>>(
    buildUrl(API_ENDPOINTS.BOOK_COPIES.LIST, params)
  );
  return response.results;
};

/**
 * Get paginated list of book copies with optional query parameters (Librarian only)
 */
export interface PaginatedBookCopyQueryParams extends BookCopyQueryParams {
  page?: number;
  page_size?: number;
}

export const getBookCopiesPaginated = async (
  params?: PaginatedBookCopyQueryParams
): Promise<PaginatedResponse<BookCopy>> => {
  return apiClient.get<PaginatedResponse<BookCopy>>(
    buildUrl(API_ENDPOINTS.BOOK_COPIES.LIST, params)
  );
};

/**
 * Get a single book copy by ID (Librarian only)
 */
export const getBookCopyById = async (id: number): Promise<BookCopy> => {
  return apiClient.get<BookCopy>(API_ENDPOINTS.BOOK_COPIES.DETAIL(id));
};

/**
 * Create a new book copy (Librarian only)
 */
export const createBookCopy = async (
  data: CreateBookCopyRequest
): Promise<BookCopy> => {
  return apiClient.post<BookCopy>(API_ENDPOINTS.BOOK_COPIES.LIST, data);
};

/**
 * Update an existing book copy (Librarian only)
 */
export const updateBookCopy = async (
  id: number,
  data: UpdateBookCopyRequest
): Promise<BookCopy> => {
  return apiClient.patch<BookCopy>(API_ENDPOINTS.BOOK_COPIES.DETAIL(id), data);
};

/**
 * Get book copy by barcode (Librarian only)
 */
export const getBookCopyByBarcode = async (barcode: string): Promise<BookCopy> => {
  return apiClient.get<BookCopy>(
    buildUrl(API_ENDPOINTS.BOOK_COPIES.BY_BARCODE, { barcode })
  );
};

/**
 * Mark book copy as maintenance (Librarian only)
 * Note: Cannot mark borrowed copies as maintenance
 */
export const markMaintenance = async (
  id: number
): Promise<MarkMaintenanceResponse> => {
  return apiClient.post<MarkMaintenanceResponse>(
    API_ENDPOINTS.BOOK_COPIES.MARK_MAINTENANCE(id)
  );
};

/**
 * Mark book copy as available (Librarian only)
 */
export const markAvailable = async (
  id: number
): Promise<MarkAvailableResponse> => {
  return apiClient.post<MarkAvailableResponse>(
    API_ENDPOINTS.BOOK_COPIES.MARK_AVAILABLE(id)
  );
};

/**
 * Mark book copy as lost (Librarian only)
 */
export const markLost = async (id: number): Promise<MarkLostResponse> => {
  return apiClient.post<MarkLostResponse>(API_ENDPOINTS.BOOK_COPIES.MARK_LOST(id));
};
