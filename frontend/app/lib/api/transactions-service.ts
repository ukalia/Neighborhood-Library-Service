import { apiClient } from "@/app/lib/api-client";
import type {
  Transaction,
  TransactionQueryParams,
  LibrarianBorrowBookRequest,
  ProcessReturnResponse,
  CollectFineResponse,
} from "@/app/types/library";

/**
 * Get list of transactions with optional query parameters
 * Members see only their own transactions, Librarians see all
 */
export const getTransactions = async (
  params?: TransactionQueryParams
): Promise<Transaction[]> => {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : "";

  const endpoint = queryString
    ? `/api/transactions/?${queryString}`
    : "/api/transactions/";
  return apiClient.get<Transaction[]>(endpoint);
};

/**
 * Get a single transaction by ID
 * Members can only access their own transactions
 */
export const getTransactionById = async (id: number): Promise<Transaction> => {
  return apiClient.get<Transaction>(`/api/transactions/${id}/`);
};

/**
 * Get overdue transactions
 * Members see only their own overdue transactions, Librarians see all
 */
export const getOverdueTransactions = async (): Promise<Transaction[]> => {
  return apiClient.get<Transaction[]>("/api/transactions/overdue/");
};

/**
 * Issue a book to a member (Librarian only)
 */
export const librarianBorrowBook = async (
  data: LibrarianBorrowBookRequest
): Promise<Transaction> => {
  return apiClient.post<Transaction>("/api/transactions/issue-book/", data);
};

/**
 * Process book return (Librarian only)
 * Calculates fine if overdue and updates book copy status
 */
export const processReturn = async (
  id: number
): Promise<ProcessReturnResponse> => {
  return apiClient.post<ProcessReturnResponse>(
    `/api/transactions/${id}/process_return/`
  );
};

/**
 * Collect fine for a transaction (Librarian only)
 * Marks fine as collected
 */
export const collectFine = async (id: number): Promise<CollectFineResponse> => {
  return apiClient.post<CollectFineResponse>(
    `/api/transactions/${id}/collect_fine/`
  );
};
