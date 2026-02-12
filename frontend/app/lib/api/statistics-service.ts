import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS from "@/app/lib/api/endpoints";
import type { LibraryOverview } from "@/app/types/library";

/**
 * Get library statistics overview (Librarian only)
 */
export const getLibraryOverview = async (): Promise<LibraryOverview> => {
  return apiClient.get<LibraryOverview>(API_ENDPOINTS.STATISTICS.OVERVIEW);
};
