import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS, { buildUrl } from "@/app/lib/api/endpoints";
import type {
  Transaction,
  TransactionQueryParams,
  LibrarianBorrowBookRequest,
  ProcessReturnResponse,
  CollectFineResponse,
  PaginatedResponse,
} from "@/app/types/library";

/**
 * Get list of transactions with optional query parameters
 * Members see only their own transactions, Librarians see all
 */
export const getTransactions = async (
  params?: TransactionQueryParams
): Promise<Transaction[]> => {
  const response = await apiClient.get<PaginatedResponse<Transaction>>(
    buildUrl(API_ENDPOINTS.TRANSACTIONS.LIST, params)
  );
  return response.results;
};

/**
 * Get paginated list of transactions with optional query parameters
 * Members see only their own transactions, Librarians see all
 */
export interface PaginatedTransactionQueryParams extends TransactionQueryParams {
  page?: number;
  page_size?: number;
}

export const getTransactionsPaginated = async (
  params?: PaginatedTransactionQueryParams
): Promise<PaginatedResponse<Transaction>> => {
  return apiClient.get<PaginatedResponse<Transaction>>(
    buildUrl(API_ENDPOINTS.TRANSACTIONS.LIST, params)
  );
};

/**
 * Get a single transaction by ID
 * Members can only access their own transactions
 */
export const getTransactionById = async (id: number): Promise<Transaction> => {
  return apiClient.get<Transaction>(API_ENDPOINTS.TRANSACTIONS.DETAIL(id));
};

/**
 * Get overdue transactions
 * Members see only their own overdue transactions, Librarians see all
 */
export const getOverdueTransactions = async (): Promise<Transaction[]> => {
  return apiClient.get<Transaction[]>(API_ENDPOINTS.TRANSACTIONS.OVERDUE);
};

/**
 * Issue a book to a member (Librarian only)
 */
export const librarianBorrowBook = async (
  data: LibrarianBorrowBookRequest
): Promise<Transaction> => {
  return apiClient.post<Transaction>(API_ENDPOINTS.TRANSACTIONS.ISSUE_BOOK, data);
};

/**
 * Process book return (Librarian only)
 * Calculates fine if overdue and updates book copy status
 */
export const processReturn = async (
  id: number
): Promise<ProcessReturnResponse> => {
  return apiClient.post<ProcessReturnResponse>(
    API_ENDPOINTS.TRANSACTIONS.PROCESS_RETURN(id)
  );
};

/**
 * Collect fine for a transaction (Librarian only)
 * Marks fine as collected
 */
export const collectFine = async (id: number): Promise<CollectFineResponse> => {
  return apiClient.post<CollectFineResponse>(
    API_ENDPOINTS.TRANSACTIONS.COLLECT_FINE(id)
  );
};
