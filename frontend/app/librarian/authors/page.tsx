"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import SearchBar from "@/app/components/ui/SearchBar";
import PaginatedTable, { Column } from "@/app/components/ui/PaginatedTable";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import Alert from "@/app/components/ui/Alert";
import {
  getAuthorsPaginated,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from "@/app/lib/api/authors-service";
import { usePagination } from "@/app/hooks/usePagination";
import type { Author, CreateAuthorRequest } from "@/app/types/library";

interface FormData {
  name: string;
  nationality: string;
}

interface FormErrors {
  name?: string;
  nationality?: string;
}

export default function AuthorsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: authors,
    loading,
    error,
    pagination,
    setPage,
    setPageSize,
    refresh,
  } = usePagination<Author>({
    fetchFunction: getAuthorsPaginated,
    queryParams: searchQuery ? { search: searchQuery } : {},
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    nationality: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [alert, setAlert] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    author: Author | null;
  }>({ isOpen: false, author: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  useEffect(() => {
    if (error) {
      setAlert({
        message: error.message || "Failed to load authors",
        variant: "error",
      });
    }
  }, [error]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedAuthor(null);
    setFormData({ name: "", nationality: "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (author: Author) => {
    setModalMode("edit");
    setSelectedAuthor(author);
    setFormData({
      name: author.name,
      nationality: author.nationality,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAuthor(null);
    setFormData({ name: "", nationality: "" });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.nationality.trim()) {
      errors.nationality = "Nationality is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const requestData: CreateAuthorRequest = {
        name: formData.name.trim(),
        nationality: formData.nationality.trim(),
      };

      if (modalMode === "create") {
        await createAuthor(requestData);
        setAlert({
          message: "Author created successfully",
          variant: "success",
        });
      } else if (selectedAuthor) {
        await updateAuthor(selectedAuthor.id, requestData);
        setAlert({
          message: "Author updated successfully",
          variant: "success",
        });
      }

      refresh();
      closeModal();
    } catch (error) {
      setAlert({
        message: error instanceof Error ? error.message : "Operation failed",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (author: Author) => {
    setDeleteConfirmModal({ isOpen: true, author });
  };

  const handleDeleteConfirm = async () => {
    const author = deleteConfirmModal.author;
    if (!author) return;

    setDeleting(true);

    try {
      await deleteAuthor(author.id);
      setAlert({
        message: "Author deleted successfully",
        variant: "success",
      });
      refresh();
      setDeleteConfirmModal({ isOpen: false, author: null });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete author";
      setAlert({
        message: errorMessage,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Author>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (author) => (
        <span className="font-medium text-gray-900">{author.name}</span>
      ),
    },
    {
      key: "nationality",
      header: "Nationality",
      sortable: true,
    },
    {
      key: "books_count",
      header: "Books Count",
      sortable: true,
      render: (author) => (
        <span className="text-gray-700">{author.books_count}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (author) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(author)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(author)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Authors Management</h1>
          <p className="mt-2 text-gray-600">
            Manage authors and their information
          </p>
        </div>

        {alert && (
          <Alert
            variant={alert.variant}
            dismissible
            onDismiss={() => setAlert(null)}
            className="mb-6"
          >
            {alert.message}
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by name or nationality..."
            />
          </div>
          <Button onClick={openCreateModal}>Add New Author</Button>
        </div>

        <PaginatedTable
          columns={columns}
          data={authors}
          keyExtractor={(author) => author.id}
          loading={loading}
          emptyMessage="No authors found"
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === "create" ? "Add New Author" : "Edit Author"}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting}
            >
              {modalMode === "create" ? "Create" : "Update"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            error={formErrors.name}
            placeholder="Enter author name"
            required
          />
          <Input
            label="Nationality"
            value={formData.nationality}
            onChange={(e) =>
              setFormData({ ...formData, nationality: e.target.value })
            }
            error={formErrors.nationality}
            placeholder="Enter nationality"
            required
          />
        </form>
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, author: null })}
        title="Confirm Delete"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setDeleteConfirmModal({ isOpen: false, author: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </>
        }
      >
        {deleteConfirmModal.author && (
          <div>
            <p className="text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteConfirmModal.author.name}
              </span>
              ?
            </p>
            {deleteConfirmModal.author.books_count > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This author has{" "}
                  {deleteConfirmModal.author.books_count} book(s) associated.
                  The delete operation may fail if books exist.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
