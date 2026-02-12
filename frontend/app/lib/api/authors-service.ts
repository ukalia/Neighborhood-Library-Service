import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS, { buildUrl } from "@/app/lib/api/endpoints";
import type {
  Author,
  AuthorQueryParams,
  CreateAuthorRequest,
  UpdateAuthorRequest,
  PaginatedResponse,
} from "@/app/types/library";

/**
 * Get list of authors with optional query parameters
 */
export const getAuthors = async (params?: AuthorQueryParams): Promise<Author[]> => {
  const response = await apiClient.get<PaginatedResponse<Author>>(
    buildUrl(API_ENDPOINTS.AUTHORS.LIST, params)
  );
  return response.results;
};

/**
 * Get paginated list of authors with optional query parameters
 */
export interface PaginatedAuthorQueryParams extends AuthorQueryParams {
  page?: number;
  page_size?: number;
}

export const getAuthorsPaginated = async (
  params?: PaginatedAuthorQueryParams
): Promise<PaginatedResponse<Author>> => {
  return apiClient.get<PaginatedResponse<Author>>(
    buildUrl(API_ENDPOINTS.AUTHORS.LIST, params)
  );
};

/**
 * Get a single author by ID
 */
export const getAuthorById = async (id: number): Promise<Author> => {
  return apiClient.get<Author>(API_ENDPOINTS.AUTHORS.DETAIL(id));
};

/**
 * Create a new author (Librarian only)
 */
export const createAuthor = async (data: CreateAuthorRequest): Promise<Author> => {
  return apiClient.post<Author>(API_ENDPOINTS.AUTHORS.LIST, data);
};

/**
 * Update an existing author (Librarian only)
 */
export const updateAuthor = async (
  id: number,
  data: UpdateAuthorRequest
): Promise<Author> => {
  return apiClient.patch<Author>(API_ENDPOINTS.AUTHORS.DETAIL(id), data);
};

/**
 * Delete an author (Librarian only)
 * Note: Will fail if author has existing books
 */
export const deleteAuthor = async (id: number): Promise<void> => {
  return apiClient.delete<void>(API_ENDPOINTS.AUTHORS.DETAIL(id));
};
