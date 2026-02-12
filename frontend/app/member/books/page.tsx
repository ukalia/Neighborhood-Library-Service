"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import SearchBar from "@/app/components/ui/SearchBar";
import PaginatedTable, { Column } from "@/app/components/ui/PaginatedTable";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { getBooksPaginated } from "@/app/lib/api/books-service";
import { usePagination } from "@/app/hooks/usePagination";
import type { Book } from "@/app/types/library";

export default function BrowseBooksPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const {
    data: books,
    loading,
    error: paginationError,
    pagination,
    setPage,
    setPageSize,
  } = usePagination<Book>({
    fetchFunction: getBooksPaginated,
    queryParams: {
      ...(searchQuery ? { search: searchQuery } : {}),
      is_archived: false,
    },
  });

  useEffect(() => {
    if (paginationError) {
      setError(paginationError.message || "Failed to fetch books");
    }
  }, [paginationError]);

  const handleViewDetails = (bookId: number) => {
    router.push(`/member/books/${bookId}`);
  };

  const columns: Column<Book>[] = [
    {
      key: "title",
      header: "Title",
    },
    {
      key: "author_name",
      header: "Author",
    },
    {
      key: "isbn",
      header: "ISBN",
    },
    {
      key: "available_copies",
      header: "Available Copies",
      render: (book) => (
        <span
          className={
            book.available_copies > 0 ? "text-green-600" : "text-red-600"
          }
        >
          {book.available_copies}/{book.total_copies}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (book) => (
        <Button
          onClick={() => handleViewDetails(book.id)}
          variant="primary"
          size="sm"
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Browse Books</h1>
        </div>

        {error && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => setError("")}
          >
            {error}
          </Alert>
        )}

        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search by title, author, or ISBN..."
          loading={false}
        />

        <PaginatedTable
          columns={columns}
          data={books}
          keyExtractor={(book) => book.id.toString()}
          loading={loading}
          emptyMessage={
            searchQuery
              ? "No books found matching your search."
              : "No books available in the library."
          }
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </DashboardLayout>
  );
}
