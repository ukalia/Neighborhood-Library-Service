"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Table, { Column } from "@/app/components/ui/Table";
import Badge from "@/app/components/ui/Badge";
import Alert from "@/app/components/ui/Alert";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import { getMyActiveBorrows } from "@/app/lib/api/members-service";
import type { BookCopy } from "@/app/types/library";

export default function MyActiveBorrowsPage() {
  const [borrows, setBorrows] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchActiveBorrows = async () => {
      try {
        setLoading(true);
        const result = await getMyActiveBorrows();

        const sortedResult = result.sort((a, b) => {
          const dateA = a.active_transaction?.due_date || "";
          const dateB = b.active_transaction?.due_date || "";
          return dateA.localeCompare(dateB);
        });

        setBorrows(sortedResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch active borrows");
      } finally {
        setLoading(false);
      }
    };
    fetchActiveBorrows();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: Column<BookCopy>[] = [
    {
      key: "book_title",
      header: "Book Title",
      render: (item) => (
        <div className={item.active_transaction?.is_overdue ? "text-red-600 font-medium" : ""}>
          {item.book_title}
        </div>
      ),
    },
    {
      key: "book_author",
      header: "Author",
      render: (item) => (
        <div className={item.active_transaction?.is_overdue ? "text-red-600" : ""}>
          {item.book_author}
        </div>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      render: (item) => (
        <div className={item.active_transaction?.is_overdue ? "text-red-600" : ""}>
          {item.barcode}
        </div>
      ),
    },
    {
      key: "borrowed_at",
      header: "Borrowed Date",
      render: (item) => (
        <div className={item.active_transaction?.is_overdue ? "text-red-600" : ""}>
          {item.active_transaction?.borrowed_at
            ? formatDate(item.active_transaction.borrowed_at)
            : "-"}
        </div>
      ),
      sortable: true,
    },
    {
      key: "due_date",
      header: "Due Date",
      render: (item) => (
        <div className={item.active_transaction?.is_overdue ? "text-red-600 font-medium" : ""}>
          {item.active_transaction?.due_date
            ? formatDate(item.active_transaction.due_date)
            : "-"}
        </div>
      ),
      sortable: true,
    },
    {
      key: "days_borrowed",
      header: "Days Borrowed",
      render: (item) => (
        <div className={item.active_transaction?.is_overdue ? "text-red-600" : ""}>
          {item.active_transaction?.days_borrowed ?? "-"}
        </div>
      ),
    },
    {
      key: "is_overdue",
      header: "Status",
      render: (item) => {
        if (item.active_transaction?.is_overdue) {
          return <Badge variant="overdue">Overdue</Badge>;
        }
        return <Badge variant="borrowed">Active</Badge>;
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">My Active Borrows</h1>
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

        {loading ? (
          <LoadingSpinner text="Loading active borrows..." />
        ) : (
          <Table
            columns={columns}
            data={borrows}
            keyExtractor={(item) => item.id}
            loading={false}
            emptyMessage="No active borrows"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
