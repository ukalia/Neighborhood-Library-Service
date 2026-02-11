import { apiClient } from "@/app/lib/api-client";
import type { LibraryOverview } from "@/app/types/library";

/**
 * Get library statistics overview (Librarian only)
 */
export const getLibraryOverview = async (): Promise<LibraryOverview> => {
  return apiClient.get<LibraryOverview>("/api/borrowing-stats/overview/");
};
