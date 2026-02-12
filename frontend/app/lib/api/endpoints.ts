/**
 * Centralized API endpoint paths
 * Single source of truth for all API endpoints
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login/",
    LOGOUT: "/api/auth/logout/",
    REFRESH: "/api/auth/refresh/",
  },
  AUTHORS: {
    LIST: "/api/authors/",
    DETAIL: (id: number) => `/api/authors/${id}/`,
  },
  BOOKS: {
    LIST: "/api/books/",
    DETAIL: (id: number) => `/api/books/${id}/`,
    ARCHIVE: (id: number) => `/api/books/${id}/archive/`,
    UNARCHIVE: (id: number) => `/api/books/${id}/unarchive/`,
    COPIES: (id: number) => `/api/books/${id}/copies/`,
  },
  BOOK_COPIES: {
    LIST: "/api/book-copies/",
    DETAIL: (id: number) => `/api/book-copies/${id}/`,
    BY_BARCODE: "/api/book-copies/by_barcode/",
    MARK_MAINTENANCE: (id: number) => `/api/book-copies/${id}/mark_maintenance/`,
    MARK_AVAILABLE: (id: number) => `/api/book-copies/${id}/mark_available/`,
    MARK_LOST: (id: number) => `/api/book-copies/${id}/mark_lost/`,
  },
  MEMBERS: {
    LIST: "/api/members/",
    DETAIL: (id: number) => `/api/members/${id}/`,
    ME: "/api/members/me/",
    DEACTIVATE: (id: number) => `/api/members/${id}/deactivate/`,
    ACTIVATE: (id: number) => `/api/members/${id}/activate/`,
    BORROWING_HISTORY: "/api/members/borrowing_history/",
    ACTIVE_BORROWS: "/api/members/active_borrows/",
  },
  TRANSACTIONS: {
    LIST: "/api/transactions/",
    DETAIL: (id: number) => `/api/transactions/${id}/`,
    OVERDUE: "/api/transactions/overdue/",
    ISSUE_BOOK: "/api/transactions/issue-book/",
    PROCESS_RETURN: (id: number) => `/api/transactions/${id}/process_return/`,
    COLLECT_FINE: (id: number) => `/api/transactions/${id}/collect_fine/`,
  },
  STATISTICS: {
    OVERVIEW: "/api/borrowing-stats/overview/",
  },
} as const;

/**
 * Helper function to build URLs with query parameters
 * @param endpoint - Base endpoint string
 * @param params - Optional query parameters object
 * @returns URL with query string appended if params provided
 */
export function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) {
    return endpoint;
  }

  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

export default API_ENDPOINTS;
