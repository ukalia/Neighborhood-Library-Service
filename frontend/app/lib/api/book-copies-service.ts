import { apiClient } from "@/app/lib/api-client";
import type {
  BookCopy,
  BookCopyQueryParams,
  CreateBookCopyRequest,
  UpdateBookCopyRequest,
  MarkMaintenanceResponse,
  MarkAvailableResponse,
  MarkLostResponse,
} from "@/app/types/library";

/**
 * Get list of book copies with optional query parameters (Librarian only)
 */
export const getBookCopies = async (
  params?: BookCopyQueryParams
): Promise<BookCopy[]> => {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : "";

  const endpoint = queryString
    ? `/api/book-copies/?${queryString}`
    : "/api/book-copies/";
  return apiClient.get<BookCopy[]>(endpoint);
};

/**
 * Get a single book copy by ID (Librarian only)
 */
export const getBookCopyById = async (id: number): Promise<BookCopy> => {
  return apiClient.get<BookCopy>(`/api/book-copies/${id}/`);
};

/**
 * Create a new book copy (Librarian only)
 */
export const createBookCopy = async (
  data: CreateBookCopyRequest
): Promise<BookCopy> => {
  return apiClient.post<BookCopy>("/api/book-copies/", data);
};

/**
 * Update an existing book copy (Librarian only)
 */
export const updateBookCopy = async (
  id: number,
  data: UpdateBookCopyRequest
): Promise<BookCopy> => {
  return apiClient.patch<BookCopy>(`/api/book-copies/${id}/`, data);
};

/**
 * Get book copy by barcode (Librarian only)
 */
export const getBookCopyByBarcode = async (barcode: string): Promise<BookCopy> => {
  return apiClient.get<BookCopy>(`/api/book-copies/by_barcode/?barcode=${barcode}`);
};

/**
 * Mark book copy as maintenance (Librarian only)
 * Note: Cannot mark borrowed copies as maintenance
 */
export const markMaintenance = async (
  id: number
): Promise<MarkMaintenanceResponse> => {
  return apiClient.post<MarkMaintenanceResponse>(
    `/api/book-copies/${id}/mark_maintenance/`
  );
};

/**
 * Mark book copy as available (Librarian only)
 */
export const markAvailable = async (
  id: number
): Promise<MarkAvailableResponse> => {
  return apiClient.post<MarkAvailableResponse>(
    `/api/book-copies/${id}/mark_available/`
  );
};

/**
 * Mark book copy as lost (Librarian only)
 */
export const markLost = async (id: number): Promise<MarkLostResponse> => {
  return apiClient.post<MarkLostResponse>(`/api/book-copies/${id}/mark_lost/`);
};
