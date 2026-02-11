import { apiClient } from "@/app/lib/api-client";
import type {
  Author,
  AuthorQueryParams,
  CreateAuthorRequest,
  UpdateAuthorRequest,
} from "@/app/types/library";

/**
 * Get list of authors with optional query parameters
 */
export const getAuthors = async (params?: AuthorQueryParams): Promise<Author[]> => {
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : "";

  const endpoint = queryString ? `/api/authors/?${queryString}` : "/api/authors/";
  return apiClient.get<Author[]>(endpoint);
};

/**
 * Get a single author by ID
 */
export const getAuthorById = async (id: number): Promise<Author> => {
  return apiClient.get<Author>(`/api/authors/${id}/`);
};

/**
 * Create a new author (Librarian only)
 */
export const createAuthor = async (data: CreateAuthorRequest): Promise<Author> => {
  return apiClient.post<Author>("/api/authors/", data);
};

/**
 * Update an existing author (Librarian only)
 */
export const updateAuthor = async (
  id: number,
  data: UpdateAuthorRequest
): Promise<Author> => {
  return apiClient.patch<Author>(`/api/authors/${id}/`, data);
};

/**
 * Delete an author (Librarian only)
 * Note: Will fail if author has existing books
 */
export const deleteAuthor = async (id: number): Promise<void> => {
  return apiClient.delete<void>(`/api/authors/${id}/`);
};
