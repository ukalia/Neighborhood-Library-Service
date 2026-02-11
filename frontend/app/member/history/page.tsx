"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Table, { Column } from "@/app/components/ui/Table";
import Badge from "@/app/components/ui/Badge";
import { getMyBorrowingHistory } from "@/app/lib/api/members-service";
import type { Transaction } from "@/app/types/library";

export default function BorrowingHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOption, setFilterOption] = useState<"all" | "withFines">("all");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMyBorrowingHistory();
        setTransactions(data);
        setFilteredTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load borrowing history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    if (filterOption === "all") {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter((t) => t.fine && parseFloat(t.fine) > 0)
      );
    }
  }, [filterOption, transactions]);

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
      sortable: true,
    },
    {
      key: "created_at",
      header: "Borrowed Date",
      sortable: true,
      render: (transaction) => formatDate(transaction.created_at),
    },
    {
      key: "returned_at",
      header: "Returned Date",
      sortable: true,
      render: (transaction) => formatDate(transaction.returned_at),
    },
    {
      key: "days_borrowed",
      header: "Days Borrowed",
      sortable: true,
      render: (transaction) => (
        <span className={transaction.is_overdue ? "text-red-600 font-semibold" : ""}>
          {transaction.days_borrowed}
        </span>
      ),
    },
    {
      key: "fine",
      header: "Fine Amount",
      sortable: true,
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
                Show All ({transactions.length})
              </button>
              <button
                onClick={() => setFilterOption("withFines")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterOption === "withFines"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Only With Fines (
                {transactions.filter((t) => t.fine && parseFloat(t.fine) > 0).length})
              </button>
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredTransactions}
            keyExtractor={(transaction) => transaction.id}
            loading={loading}
            emptyMessage="No borrowing history"
            pageSize={10}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
