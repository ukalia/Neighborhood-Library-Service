"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import SearchBar from "@/app/components/ui/SearchBar";
import Table, { Column } from "@/app/components/ui/Table";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import Badge from "@/app/components/ui/Badge";
import Alert from "@/app/components/ui/Alert";
import {
  getTransactions,
  processReturn,
  collectFine,
} from "@/app/lib/api/transactions-service";
import type { Transaction } from "@/app/types/library";

type FilterTab = "all" | "active" | "overdue" | "returned";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isProcessReturnModalOpen, setIsProcessReturnModalOpen] =
    useState(false);
  const [isCollectFineModalOpen, setIsCollectFineModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, activeTab, searchQuery]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = useCallback(() => {
    let filtered = [...transactions];

    switch (activeTab) {
      case "active":
        filtered = filtered.filter((t) => !t.returned_at);
        break;
      case "overdue":
        filtered = filtered.filter((t) => !t.returned_at && t.is_overdue);
        break;
      case "returned":
        filtered = filtered.filter((t) => t.returned_at);
        break;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.book_title.toLowerCase().includes(query) ||
          t.barcode.toLowerCase().includes(query) ||
          t.borrower_name.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, activeTab, searchQuery]);

  const handleProcessReturn = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsProcessReturnModalOpen(true);
  };

  const handleCollectFine = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsCollectFineModalOpen(true);
  };

  const confirmProcessReturn = async () => {
    if (!selectedTransaction) return;

    try {
      setProcessing(true);
      setError("");
      const response = await processReturn(selectedTransaction.id);
      setSuccess(
        `Book returned successfully. Fine: $${response.fine} (${response.days_borrowed} days borrowed)`
      );
      setIsProcessReturnModalOpen(false);
      setSelectedTransaction(null);
      await fetchTransactions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process return"
      );
    } finally {
      setProcessing(false);
    }
  };

  const confirmCollectFine = async () => {
    if (!selectedTransaction) return;

    try {
      setProcessing(true);
      setError("");
      await collectFine(selectedTransaction.id);
      setSuccess("Fine collected successfully");
      setIsCollectFineModalOpen(false);
      setSelectedTransaction(null);
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to collect fine");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (transaction: Transaction) => {
    if (transaction.returned_at) {
      return <Badge variant="active">Returned</Badge>;
    }
    if (transaction.is_overdue) {
      return <Badge variant="overdue">Overdue</Badge>;
    }
    return <Badge variant="borrowed">Active</Badge>;
  };

  const columns: Column<Transaction>[] = [
    {
      key: "id",
      header: "Transaction ID",
      sortable: true,
    },
    {
      key: "book_title",
      header: "Book Title",
      sortable: true,
    },
    {
      key: "barcode",
      header: "Barcode",
      sortable: true,
    },
    {
      key: "borrower_name",
      header: "Member Name",
      sortable: true,
    },
    {
      key: "created_at",
      header: "Borrowed Date",
      sortable: true,
      render: (transaction) => formatDate(transaction.created_at),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      render: (transaction) => formatDate(transaction.due_date),
    },
    {
      key: "returned_at",
      header: "Returned Date",
      render: (transaction) =>
        transaction.returned_at ? formatDate(transaction.returned_at) : "-",
    },
    {
      key: "fine",
      header: "Fine",
      render: (transaction) =>
        transaction.fine ? `$${transaction.fine}` : "-",
    },
    {
      key: "status",
      header: "Status",
      render: getStatusBadge,
    },
    {
      key: "actions",
      header: "Actions",
      render: (transaction) => (
        <div className="flex gap-2">
          {!transaction.returned_at && (
            <Button
              size="sm"
              onClick={() => handleProcessReturn(transaction)}
            >
              Process Return
            </Button>
          )}
          {transaction.fine &&
            parseFloat(transaction.fine) > 0 &&
            !transaction.fine_collected && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCollectFine(transaction)}
              >
                Collect Fine
              </Button>
            )}
        </div>
      ),
    },
  ];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "overdue", label: "Overdue" },
    { key: "returned", label: "Returned" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Transactions & Returns
          </h1>
        </div>

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onDismiss={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search by book title, barcode, or member name..."
          loading={loading}
        />

        <Table
          columns={columns}
          data={filteredTransactions}
          keyExtractor={(transaction) => transaction.id}
          loading={loading}
          emptyMessage="No transactions found"
          pageSize={10}
        />

        <Modal
          isOpen={isProcessReturnModalOpen}
          onClose={() => {
            setIsProcessReturnModalOpen(false);
            setSelectedTransaction(null);
          }}
          title="Process Return"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsProcessReturnModalOpen(false);
                  setSelectedTransaction(null);
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmProcessReturn}
                loading={processing}
              >
                Confirm Return
              </Button>
            </>
          }
        >
          {selectedTransaction && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to process the return for this book?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Book:</span>
                  <span className="text-gray-900">
                    {selectedTransaction.book_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Barcode:</span>
                  <span className="text-gray-900">
                    {selectedTransaction.barcode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Member:</span>
                  <span className="text-gray-900">
                    {selectedTransaction.borrower_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Days Borrowed:</span>
                  <span className="text-gray-900">
                    {selectedTransaction.days_borrowed}
                  </span>
                </div>
                {selectedTransaction.is_overdue && (
                  <div className="flex justify-between">
                    <span className="font-medium text-red-700">Status:</span>
                    <Badge variant="overdue">Overdue</Badge>
                  </div>
                )}
              </div>
              {selectedTransaction.is_overdue && (
                <Alert variant="warning">
                  This book is overdue. A fine will be calculated upon return.
                </Alert>
              )}
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isCollectFineModalOpen}
          onClose={() => {
            setIsCollectFineModalOpen(false);
            setSelectedTransaction(null);
          }}
          title="Collect Fine"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCollectFineModalOpen(false);
                  setSelectedTransaction(null);
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmCollectFine}
                loading={processing}
              >
                Confirm Collection
              </Button>
            </>
          }
        >
          {selectedTransaction && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Confirm that you have collected the fine for this transaction.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Book:</span>
                  <span className="text-gray-900">
                    {selectedTransaction.book_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Member:</span>
                  <span className="text-gray-900">
                    {selectedTransaction.borrower_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-red-700">Fine Amount:</span>
                  <span className="text-red-900 font-bold text-lg">
                    ${selectedTransaction.fine}
                  </span>
                </div>
              </div>
              <Alert variant="info">
                Once confirmed, this fine will be marked as collected and cannot be undone.
              </Alert>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
