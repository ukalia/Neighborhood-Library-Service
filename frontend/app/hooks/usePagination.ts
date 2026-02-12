"use client";

import { useState, useEffect, useCallback } from "react";
import type { PaginatedResponse, PaginationMeta } from "@/app/types/library";

interface UsePaginationOptions<T> {
  fetchFunction: (params?: Record<string, string | number | boolean | undefined>) => Promise<PaginatedResponse<T>>;
  queryParams?: Record<string, string | number | boolean | undefined>;
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: PaginationMeta;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refresh: () => void;
}

/**
 * Custom hook for managing server-side pagination
 * @param options - Configuration options including fetch function and query params
 * @returns Pagination state and controls
 */
export function usePagination<T>({
  fetchFunction,
  queryParams = {},
  initialPage = 1,
  initialPageSize = 20,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    pageSize: initialPageSize,
    totalCount: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const queryParamsKey = JSON.stringify(queryParams);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchFunction({
        ...queryParams,
        page,
        page_size: pageSize,
      });

      setData(response.results);

      const totalPages = Math.ceil(response.count / pageSize);
      setPagination({
        currentPage: page,
        totalPages,
        pageSize,
        totalCount: response.count,
        hasNext: response.next !== null,
        hasPrevious: response.previous !== null,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, queryParamsKey, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetPageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    pagination,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    refresh,
  };
}
