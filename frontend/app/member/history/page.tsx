"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import PaginatedTable, { Column } from "@/app/components/ui/PaginatedTable";
import Badge from "@/app/components/ui/Badge";
import { getMyBorrowingHistoryPaginated } from "@/app/lib/api/members-service";
import { usePagination } from "@/app/hooks/usePagination";
import type { Transaction } from "@/app/types/library";

export default function BorrowingHistory() {
  const [error, setError] = useState("");
  const [filterOption, setFilterOption] = useState<"all" | "withFines">("all");

  const {
    data: transactions,
    loading,
    error: paginationError,
    pagination,
    setPage,
    setPageSize,
  } = usePagination<Transaction>({
    fetchFunction: getMyBorrowingHistoryPaginated,
    queryParams: {},
  });

  useEffect(() => {
    if (paginationError) {
      setError(paginationError.message || "Failed to load borrowing history");
    }
  }, [paginationError]);

  const filteredTransactions =
    filterOption === "all"
      ? transactions
      : transactions.filter((t) => t.fine && parseFloat(t.fine) > 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not returned";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: Column<Transaction>[] = [
    {
      key: "book_title",
      header: "Book Title",
      render: (transaction) => transaction.book_title,
    },
    {
      key: "created_at",
      header: "Borrowed Date",
      render: (transaction) => formatDate(transaction.created_at),
    },
    {
      key: "returned_at",
      header: "Returned Date",
      render: (transaction) => formatDate(transaction.returned_at),
    },
    {
      key: "days_borrowed",
      header: "Days Borrowed",
      render: (transaction) => (
        <span className={transaction.is_overdue ? "text-red-600 font-semibold" : ""}>
          {transaction.days_borrowed}
        </span>
      ),
    },
    {
      key: "fine",
      header: "Fine Amount",
      render: (transaction) => {
        if (!transaction.fine || parseFloat(transaction.fine) === 0) {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-red-600">${transaction.fine}</span>
            {transaction.fine_collected ? (
              <Badge variant="active">Collected</Badge>
            ) : (
              <Badge variant="overdue">Pending</Badge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Borrowing History</h1>
            <p className="text-gray-600 mt-1">View all your past book borrowing transactions</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-surface shadow-card rounded-lg p-4">
          {filterOption === "withFines" && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm">
              Showing transactions with fines on current page. Navigate through pages to see all transactions with fines.
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterOption("all")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterOption === "all"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Show All
              </button>
              <button
                onClick={() => setFilterOption("withFines")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterOption === "withFines"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Only With Fines
              </button>
            </div>
          </div>

          <PaginatedTable
            columns={columns}
            data={filteredTransactions}
            keyExtractor={(transaction) => transaction.id}
            loading={loading}
            emptyMessage="No borrowing history"
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
