"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Table from "@/app/components/ui/Table";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import Select from "@/app/components/ui/Select";
import SearchBar from "@/app/components/ui/SearchBar";
import Badge from "@/app/components/ui/Badge";
import Alert from "@/app/components/ui/Alert";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import {
  getBookCopies,
  createBookCopy,
  updateBookCopy,
  markAvailable,
  markMaintenance,
  markLost,
} from "@/app/lib/api/book-copies-service";
import { getBooks } from "@/app/lib/api/books-service";
import type { BookCopy, Book, BookCopyStatus } from "@/app/types/library";

export default function BookCopiesPage() {
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [filteredCopies, setFilteredCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookCopyStatus | "all">("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCopy, setEditingCopy] = useState<BookCopy | null>(null);

  const [formData, setFormData] = useState({
    book: "0",
    barcode: "",
    status: "available" as BookCopyStatus,
  });
  const [formErrors, setFormErrors] = useState({
    book: "",
    barcode: "",
    status: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, bookCopies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [copiesData, booksData] = await Promise.all([
        getBookCopies(),
        getBooks(),
      ]);
      setBookCopies(copiesData);
      setBooks(booksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...bookCopies];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (copy) =>
          copy.barcode.toLowerCase().includes(query) ||
          copy.book_title.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((copy) => copy.status === statusFilter);
    }

    setFilteredCopies(filtered);
  }, [searchQuery, statusFilter, bookCopies]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const validateForm = () => {
    const errors = {
      book: "",
      barcode: "",
      status: "",
    };
    let isValid = true;

    if (!formData.book || formData.book === "0") {
      errors.book = "Please select a book";
      isValid = false;
    }

    if (!formData.barcode.trim()) {
      errors.barcode = "Barcode is required";
      isValid = false;
    }

    if (!formData.status) {
      errors.status = "Status is required";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await createBookCopy({
        book: Number(formData.book),
        barcode: formData.barcode.trim(),
        status: formData.status,
      });
      setSuccess("Book copy created successfully");
      setShowCreateModal(false);
      setFormData({
        book: "0",
        barcode: "",
        status: "available",
      });
      await fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book copy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCopy || !formData.barcode.trim()) {
      setError("Barcode is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await updateBookCopy(editingCopy.id, {
        barcode: formData.barcode.trim(),
      });
      setSuccess("Book copy updated successfully");
      setShowEditModal(false);
      setEditingCopy(null);
      await fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update book copy");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      book: "0",
      barcode: "",
      status: "available",
    });
    setFormErrors({
      book: "",
      barcode: "",
      status: "",
    });
    setError("");
    setShowCreateModal(true);
  };

  const openEditModal = (copy: BookCopy) => {
    setEditingCopy(copy);
    setFormData({
      book: String(copy.book),
      barcode: copy.barcode,
      status: copy.status,
    });
    setFormErrors({
      book: "",
      barcode: "",
      status: "",
    });
    setError("");
    setShowEditModal(true);
  };

  const handleMarkStatus = async (
    copyId: number,
    action: "available" | "maintenance" | "lost"
  ) => {
    try {
      setError("");
      if (action === "available") {
        await markAvailable(copyId);
        setSuccess("Book copy marked as available");
      } else if (action === "maintenance") {
        await markMaintenance(copyId);
        setSuccess("Book copy marked as maintenance");
      } else if (action === "lost") {
        await markLost(copyId);
        setSuccess("Book copy marked as lost");
      }
      await fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const getStatusBadgeVariant = (status: BookCopyStatus) => {
    switch (status) {
      case "available":
        return "success";
      case "borrowed":
        return "warning";
      case "maintenance":
        return "info";
      case "lost":
        return "danger";
      default:
        return "default";
    }
  };

  const columns = [
    {
      key: "barcode",
      header: "Barcode",
      render: (copy: BookCopy) => <span className="font-mono">{copy.barcode}</span>,
    },
    {
      key: "book_title",
      header: "Book Title",
      render: (copy: BookCopy) => copy.book_title,
    },
    {
      key: "book_author",
      header: "Author",
      render: (copy: BookCopy) => copy.book_author,
    },
    {
      key: "status",
      header: "Status",
      render: (copy: BookCopy) => (
        <Badge variant={getStatusBadgeVariant(copy.status)}>
          {copy.status.charAt(0).toUpperCase() + copy.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "borrower_name",
      header: "Borrowed By",
      render: (copy: BookCopy) => copy.borrower_name || "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (copy: BookCopy) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openEditModal(copy)}
          >
            Edit
          </Button>
          {copy.status !== "borrowed" && (
            <>
              {copy.status !== "available" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleMarkStatus(copy.id, "available")}
                >
                  Mark Available
                </Button>
              )}
              {copy.status !== "maintenance" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkStatus(copy.id, "maintenance")}
                >
                  Mark Maintenance
                </Button>
              )}
              {copy.status !== "lost" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleMarkStatus(copy.id, "lost")}
                >
                  Mark Lost
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Loading book copies..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-text">Book Copies Management</h1>
          <Button variant="primary" onClick={openCreateModal}>
            Add New Copy
          </Button>
        </div>

        {error && (
          <Alert variant="error" onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onDismiss={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <SearchBar
              onSearch={handleSearchChange}
              placeholder="Search by barcode or book title..."
            />
          </div>
          <div className="w-48">
            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookCopyStatus | "all")}
              options={[
                { value: "all", label: "All Status" },
                { value: "available", label: "Available" },
                { value: "borrowed", label: "Borrowed" },
                { value: "maintenance", label: "Maintenance" },
                { value: "lost", label: "Lost" },
              ]}
            />
          </div>
        </div>

        {filteredCopies.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg">
            <p className="text-text-secondary text-lg">
              {searchQuery || statusFilter !== "all"
                ? "No book copies found matching your filters"
                : "No book copies available"}
            </p>
          </div>
        ) : (
          <Table columns={columns} data={filteredCopies} keyExtractor={(copy) => copy.id} />
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Book Copy"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Book"
            value={formData.book}
            onChange={(e) =>
              setFormData({ ...formData, book: e.target.value })
            }
            options={[
              { value: "0", label: "Select a book" },
              ...books.map((book) => ({
                value: String(book.id),
                label: `${book.title} - ${book.author_name}`,
              })),
            ]}
            error={formErrors.book}
            required
          />

          <Input
            label="Barcode"
            value={formData.barcode}
            onChange={(e) =>
              setFormData({ ...formData, barcode: e.target.value })
            }
            error={formErrors.barcode}
            placeholder="Enter barcode"
            required
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as BookCopyStatus,
              })
            }
            options={[
              { value: "available", label: "Available" },
              { value: "maintenance", label: "Maintenance" },
              { value: "lost", label: "Lost" },
            ]}
            error={formErrors.status}
            required
          />

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Book Copy
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Book Copy"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Barcode"
            value={formData.barcode}
            onChange={(e) =>
              setFormData({ ...formData, barcode: e.target.value })
            }
            placeholder="Enter barcode"
            required
          />

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Update Book Copy
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
