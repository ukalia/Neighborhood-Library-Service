"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Button from "@/app/components/ui/Button";
import Table, { Column } from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import Alert from "@/app/components/ui/Alert";
import Badge from "@/app/components/ui/Badge";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import {
  getMemberById,
  getMemberActiveBorrows,
  getMemberHistory,
} from "@/app/lib/api/members-service";
import { librarianBorrowBook } from "@/app/lib/api/transactions-service";
import type { Member, BookCopy, Transaction } from "@/app/types/library";

type TabType = "active-borrows" | "history";

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = parseInt(params.id as string, 10);

  const [member, setMember] = useState<Member | null>(null);
  const [activeBorrows, setActiveBorrows] = useState<BookCopy[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("active-borrows");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMemberData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [memberData, activeBorrowsData, historyData] = await Promise.all([
        getMemberById(memberId),
        getMemberActiveBorrows(memberId),
        getMemberHistory(memberId),
      ]);
      setMember(memberData);
      setActiveBorrows(activeBorrowsData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch member data");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (!isNaN(memberId)) {
      fetchMemberData();
    }
  }, [memberId, fetchMemberData]);

  const handleBorrowOnBehalf = async () => {
    if (!barcode.trim()) {
      setBarcodeError("Barcode is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setBarcodeError("");
      await librarianBorrowBook({ barcode, member_id: memberId });
      setSuccessMessage("Book borrowed successfully on behalf of member");
      setIsBorrowModalOpen(false);
      setBarcode("");
      await fetchMemberData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to borrow book");
    } finally {
      setSubmitting(false);
    }
  };

  const activeBorrowsColumns: Column<BookCopy>[] = [
    {
      key: "book_title",
      header: "Book Title",
      sortable: true,
    },
    {
      key: "book_author",
      header: "Author",
      sortable: true,
    },
    {
      key: "barcode",
      header: "Barcode",
    },
    {
      key: "borrowed_at",
      header: "Borrowed Date",
      sortable: true,
      render: (copy) =>
        copy.active_transaction
          ? new Date(copy.active_transaction.borrowed_at).toLocaleDateString()
          : "N/A",
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      render: (copy) =>
        copy.active_transaction
          ? new Date(copy.active_transaction.due_date).toLocaleDateString()
          : "N/A",
    },
    {
      key: "days_borrowed",
      header: "Days Borrowed",
      sortable: true,
      render: (copy) => copy.active_transaction?.days_borrowed ?? "N/A",
    },
    {
      key: "is_overdue",
      header: "Status",
      render: (copy) =>
        copy.active_transaction?.is_overdue ? (
          <Badge variant="overdue">Overdue</Badge>
        ) : (
          <Badge variant="borrowed">Active</Badge>
        ),
    },
  ];

  const historyColumns: Column<Transaction>[] = [
    {
      key: "book_title",
      header: "Book Title",
      sortable: true,
    },
    {
      key: "barcode",
      header: "Barcode",
    },
    {
      key: "created_at",
      header: "Borrowed Date",
      sortable: true,
      render: (transaction) => new Date(transaction.created_at).toLocaleDateString(),
    },
    {
      key: "returned_at",
      header: "Returned Date",
      sortable: true,
      render: (transaction) =>
        transaction.returned_at
          ? new Date(transaction.returned_at).toLocaleDateString()
          : "Not returned",
    },
    {
      key: "days_borrowed",
      header: "Days Borrowed",
      sortable: true,
    },
    {
      key: "fine",
      header: "Fine",
      sortable: true,
      render: (transaction) =>
        transaction.fine ? (
          <span className="font-semibold text-red-600">${transaction.fine}</span>
        ) : (
          <span className="text-gray-500">$0.00</span>
        ),
    },
    {
      key: "fine_collected",
      header: "Fine Status",
      render: (transaction) =>
        transaction.fine && parseFloat(transaction.fine) > 0 ? (
          transaction.fine_collected ? (
            <Badge variant="active">Collected</Badge>
          ) : (
            <Badge variant="overdue">Pending</Badge>
          )
        ) : (
          <span className="text-gray-500">N/A</span>
        ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Loading member details..." />
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout>
        <Alert variant="error">Member not found</Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={() => router.back()}>
              ← Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Member Details</h1>
          </div>
          <Button onClick={() => setIsBorrowModalOpen(true)}>Borrow on Behalf</Button>
        </div>

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onDismiss={() => setSuccessMessage("")}>
            {successMessage}
          </Alert>
        )}

        <div className="bg-white shadow-card rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="text-lg font-semibold text-gray-900">{member.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-semibold text-gray-900">{member.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="text-lg font-semibold text-gray-900">
                {member.first_name} {member.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="text-lg font-semibold text-gray-900">{member.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="text-lg font-semibold text-gray-900">{member.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">
                <Badge variant={member.is_active ? "active" : "inactive"}>
                  {member.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Borrows</p>
              <p className="text-lg font-semibold text-blue-600">
                {member.active_borrows_count}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Borrows</p>
              <p className="text-lg font-semibold text-gray-900">
                {member.total_borrows_count}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(member.date_joined).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-card rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("active-borrows")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "active-borrows"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Active Borrows ({activeBorrows.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Borrowing History ({history.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "active-borrows" ? (
              <Table
                columns={activeBorrowsColumns}
                data={activeBorrows}
                keyExtractor={(copy) => copy.id}
                emptyMessage="No active borrows"
              />
            ) : (
              <Table
                columns={historyColumns}
                data={history}
                keyExtractor={(transaction) => transaction.id}
                emptyMessage="No borrowing history"
              />
            )}
          </div>
        </div>

        <Modal
          isOpen={isBorrowModalOpen}
          onClose={() => {
            setIsBorrowModalOpen(false);
            setBarcode("");
            setBarcodeError("");
          }}
          title="Borrow Book on Behalf"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsBorrowModalOpen(false);
                  setBarcode("");
                  setBarcodeError("");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleBorrowOnBehalf} loading={submitting}>
                Borrow Book
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the barcode of the book copy to borrow on behalf of{" "}
              <span className="font-semibold">{member.username}</span>.
            </p>
            <Input
              label="Book Copy Barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              error={barcodeError}
              placeholder="Enter barcode"
              required
            />
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
