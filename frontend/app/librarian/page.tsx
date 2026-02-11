"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Card from "@/app/components/Card";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import Table, { Column } from "@/app/components/ui/Table";
import Badge from "@/app/components/ui/Badge";
import Alert from "@/app/components/ui/Alert";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import { getLibraryOverview } from "@/app/lib/api/statistics-service";
import { getBooks } from "@/app/lib/api/books-service";
import { getTransactions, processReturn, librarianBorrowBook } from "@/app/lib/api/transactions-service";
import { getMembers } from "@/app/lib/api/members-service";
import Select from "@/app/components/ui/Select";
import type { LibraryOverview, Transaction, Member, LibrarianBorrowBookRequest } from "@/app/types/library";

export default function LibrarianPage() {
  const { isAuthenticated, role } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<LibraryOverview | null>(null);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnBarcode, setReturnBarcode] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowFormData, setBorrowFormData] = useState<LibrarianBorrowBookRequest>({
    barcode: "",
    member_id: 0,
  });
  const [borrowFormErrors, setBorrowFormErrors] = useState<{
    barcode?: string;
    member_id?: string;
  }>({});
  const [processingBorrow, setProcessingBorrow] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (role !== "LIBRARIAN") {
      router.push("/member");
    }
  }, [isAuthenticated, role, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [overviewData, booksData, transactionsData, membersData] = await Promise.all([
          getLibraryOverview(),
          getBooks(),
          getTransactions({ active_only: false }),
          getMembers({ is_active: true }),
        ]);

        setOverview(overviewData);
        setTotalBooks(booksData.length);
        setRecentTransactions(transactionsData.slice(0, 5));
        setMembers(membersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && role === "LIBRARIAN") {
      fetchDashboardData();
    }
  }, [isAuthenticated, role]);

  const handleProcessReturn = async () => {
    if (!returnBarcode.trim()) {
      setError("Please enter a barcode");
      return;
    }

    try {
      setProcessingReturn(true);
      setError("");

      const transactions = await getTransactions({ active_only: true });
      const transaction = transactions.find(
        (t) => t.barcode === returnBarcode.trim()
      );

      if (!transaction) {
        setError("No active borrow found for this barcode");
        return;
      }

      const result = await processReturn(transaction.id);
      setReturnSuccess(
        `Book returned successfully. Fine: $${result.fine || "0.00"}`
      );
      setShowReturnModal(false);
      setReturnBarcode("");

      const [overviewData, transactionsData] = await Promise.all([
        getLibraryOverview(),
        getTransactions({ active_only: false }),
      ]);
      setOverview(overviewData);
      setRecentTransactions(transactionsData.slice(0, 5));

      setTimeout(() => setReturnSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process return");
    } finally {
      setProcessingReturn(false);
    }
  };

  const validateBorrowForm = (): boolean => {
    const errors: { barcode?: string; member_id?: string } = {};
    if (!borrowFormData.barcode.trim()) {
      errors.barcode = "Please enter a barcode";
    }
    if (!borrowFormData.member_id || borrowFormData.member_id === 0) {
      errors.member_id = "Please select a member";
    }
    setBorrowFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBorrowBook = async () => {
    if (!validateBorrowForm()) return;

    try {
      setProcessingBorrow(true);
      setError("");

      const result = await librarianBorrowBook({
        barcode: borrowFormData.barcode.trim(),
        member_id: borrowFormData.member_id,
      });

      const member = members.find(m => m.id === borrowFormData.member_id);
      const memberName = `${member?.first_name} ${member?.last_name}`;

      setBorrowSuccess(
        `Book borrowed successfully for ${memberName}. Due date: ${new Date(
          result.due_date
        ).toLocaleDateString()}`
      );

      setShowBorrowModal(false);
      setBorrowFormData({ barcode: "", member_id: 0 });
      setBorrowFormErrors({});

      const [overviewData, transactionsData] = await Promise.all([
        getLibraryOverview(),
        getTransactions({ active_only: false }),
      ]);
      setOverview(overviewData);
      setRecentTransactions(transactionsData.slice(0, 5));

      setTimeout(() => setBorrowSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to borrow book");
    } finally {
      setProcessingBorrow(false);
    }
  };

  if (!isAuthenticated || role !== "LIBRARIAN") {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const transactionColumns: Column<Transaction>[] = [
    {
      key: "book_title",
      header: "Book Title",
      sortable: true,
    },
    {
      key: "borrower_name",
      header: "Borrower",
      sortable: true,
    },
    {
      key: "created_at",
      header: "Borrowed Date",
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString(),
    },
    {
      key: "returned_at",
      header: "Status",
      render: (item) =>
        item.returned_at ? (
          <Badge variant="available">Returned</Badge>
        ) : item.is_overdue ? (
          <Badge variant="overdue">Overdue</Badge>
        ) : (
          <Badge variant="borrowed">Active</Badge>
        ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Librarian Dashboard
        </h1>

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {returnSuccess && (
          <Alert
            variant="success"
            dismissible
            onDismiss={() => setReturnSuccess("")}
          >
            {returnSuccess}
          </Alert>
        )}

        {borrowSuccess && (
          <Alert
            variant="success"
            dismissible
            onDismiss={() => setBorrowSuccess("")}
          >
            {borrowSuccess}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Books</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalBooks}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Available Copies
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.copies.available || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Transactions
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.transactions.active || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Overdue Transactions
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.transactions.overdue || 0}
                  {overview && overview.transactions.overdue > 0 && (
                    <Badge variant="overdue" className="ml-2">
                      !
                    </Badge>
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.members.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Borrowers
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.members.active_borrowers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setShowBorrowModal(true)}
              variant="primary"
            >
              Issue Book
            </Button>
            <Button
              onClick={() => setShowReturnModal(true)}
              variant="primary"
            >
              Process Return
            </Button>
            <Button
              onClick={() => router.push("/librarian/books")}
              variant="secondary"
            >
              Add New Book
            </Button>
            <Button
              onClick={() => router.push("/librarian/members")}
              variant="secondary"
            >
              Register Member
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <Table
            columns={transactionColumns}
            data={recentTransactions}
            keyExtractor={(item) => item.id.toString()}
            emptyMessage="No recent transactions"
            pageSize={5}
          />
        </Card>
      </div>

      <Modal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setReturnBarcode("");
          setError("");
        }}
        title="Process Return"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowReturnModal(false);
                setReturnBarcode("");
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleProcessReturn}
              loading={processingReturn}
              disabled={!returnBarcode.trim()}
            >
              Confirm Return
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the barcode of the book copy being returned.
          </p>
          <Input
            label="Barcode"
            value={returnBarcode}
            onChange={(e) => setReturnBarcode(e.target.value)}
            placeholder="Enter barcode"
            error={error}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showBorrowModal}
        onClose={() => {
          setShowBorrowModal(false);
          setBorrowFormData({ barcode: "", member_id: 0 });
          setBorrowFormErrors({});
          setError("");
        }}
        title="Issue Book"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBorrowModal(false);
                setBorrowFormData({ barcode: "", member_id: 0 });
                setBorrowFormErrors({});
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBorrowBook}
              loading={processingBorrow}
              disabled={!borrowFormData.barcode.trim() || !borrowFormData.member_id}
            >
              Confirm Borrow
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a member and scan/enter the book barcode to process the borrow.
          </p>

          <Select
            label="Member"
            value={borrowFormData.member_id.toString()}
            onChange={(e) => {
              setBorrowFormData({ ...borrowFormData, member_id: Number(e.target.value) });
              setBorrowFormErrors({ ...borrowFormErrors, member_id: undefined });
            }}
            options={[
              { value: "0", label: "Select a member" },
              ...members.map((member) => ({
                value: member.id.toString(),
                label: `${member.first_name} ${member.last_name} (${member.active_borrows_count} books borrowed)`,
              })),
            ]}
            error={borrowFormErrors.member_id}
          />

          <Input
            label="Barcode"
            value={borrowFormData.barcode}
            onChange={(e) => {
              setBorrowFormData({ ...borrowFormData, barcode: e.target.value });
              setBorrowFormErrors({ ...borrowFormErrors, barcode: undefined });
            }}
            placeholder="Enter or scan barcode"
            error={borrowFormErrors.barcode}
            autoFocus
          />

          {error && (
            <Alert variant="error" dismissible onDismiss={() => setError("")}>
              {error}
            </Alert>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
