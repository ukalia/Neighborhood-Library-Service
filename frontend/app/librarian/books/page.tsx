"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import SearchBar from "@/app/components/ui/SearchBar";
import Table, { Column } from "@/app/components/ui/Table";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import Input from "@/app/components/ui/Input";
import Select from "@/app/components/ui/Select";
import Alert from "@/app/components/ui/Alert";
import Badge from "@/app/components/ui/Badge";
import {
  getBooks,
  createBook,
  updateBook,
  deleteBook,
  archiveBook,
  unarchiveBook,
} from "@/app/lib/api/books-service";
import { getAuthors } from "@/app/lib/api/authors-service";
import type { Book, Author, CreateBookRequest } from "@/app/types/library";

export default function BooksManagementPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [formData, setFormData] = useState<CreateBookRequest>({
    title: "",
    author: 0,
    isbn: "",
  });
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    author?: string;
    isbn?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksData, authorsData] = await Promise.all([
        getBooks(),
        getAuthors(),
      ]);
      setBooks(booksData);
      setFilteredBooks(booksData);
      setAuthors(authorsData);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchLoading(true);
    const searchTerm = value.toLowerCase();
    const filtered = books.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author_name.toLowerCase().includes(searchTerm) ||
        book.isbn.toLowerCase().includes(searchTerm)
    );
    setFilteredBooks(filtered);
    setSearchLoading(false);
  };

  const validateForm = (): boolean => {
    const errors: { title?: string; author?: string; isbn?: string } = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.author || formData.author === 0) {
      errors.author = "Author is required";
    }

    if (!formData.isbn.trim()) {
      errors.isbn = "ISBN is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ title: "", author: 0, isbn: "" });
    setFormErrors({});
    setSelectedBook(null);
  };

  const handleCreateBook = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await createBook(formData);
      setSuccess("Book created successfully");
      setIsCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBook = async () => {
    if (!selectedBook || !validateForm()) return;

    try {
      setSubmitting(true);
      await updateBook(selectedBook.id, formData);
      setSuccess("Book updated successfully");
      setIsEditModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update book");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!selectedBook) return;

    try {
      setSubmitting(true);
      await deleteBook(selectedBook.id);
      setSuccess("Book deleted successfully");
      setIsDeleteModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete book. It may have existing copies."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async (book: Book) => {
    try {
      if (book.is_archived) {
        await unarchiveBook(book.id);
        setSuccess("Book unarchived successfully");
      } else {
        await archiveBook(book.id);
        setSuccess("Book archived successfully");
      }
      fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update book status"
      );
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (book: Book) => {
    setSelectedBook(book);
    setIsDeleteModalOpen(true);
  };

  const handleViewCopies = (bookId: number) => {
    router.push(`/librarian/book-copies?book=${bookId}`);
  };

  const columns: Column<Book>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
    },
    {
      key: "author_name",
      header: "Author",
      sortable: true,
    },
    {
      key: "isbn",
      header: "ISBN",
    },
    {
      key: "total_copies",
      header: "Total Copies",
      sortable: true,
    },
    {
      key: "available_copies",
      header: "Available Copies",
      sortable: true,
    },
    {
      key: "is_archived",
      header: "Status",
      render: (book) => (
        <Badge variant={book.is_archived ? "inactive" : "active"}>
          {book.is_archived ? "Archived" : "Active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (book) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(book)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleViewCopies(book.id)}
          >
            View Copies
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleArchiveToggle(book)}
          >
            {book.is_archived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => openDeleteModal(book)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const authorOptions = [
    { value: "0", label: "Select an author" },
    ...authors.map((author) => ({
      value: author.id.toString(),
      label: author.name,
    })),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Books Management</h1>
          <Button onClick={openCreateModal}>Add New Book</Button>
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

        <SearchBar
          placeholder="Search by title, author, or ISBN..."
          onSearch={handleSearch}
          loading={searchLoading}
        />

        <Table
          columns={columns}
          data={filteredBooks}
          keyExtractor={(book) => book.id.toString()}
          loading={loading}
          emptyMessage="No books found"
        />
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Book"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBook} loading={submitting}>
              Create Book
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            error={formErrors.title}
            placeholder="Enter book title"
            required
          />

          <Select
            label="Author"
            value={formData.author.toString()}
            onChange={(e) =>
              setFormData({ ...formData, author: parseInt(e.target.value) })
            }
            options={authorOptions}
            error={formErrors.author}
            required
          />

          <Input
            label="ISBN"
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            error={formErrors.isbn}
            placeholder="Enter ISBN"
            required
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Book"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditBook} loading={submitting}>
              Update Book
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            error={formErrors.title}
            placeholder="Enter book title"
            required
          />

          <Select
            label="Author"
            value={formData.author.toString()}
            onChange={(e) =>
              setFormData({ ...formData, author: parseInt(e.target.value) })
            }
            options={authorOptions}
            error={formErrors.author}
            required
          />

          <Input
            label="ISBN"
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            error={formErrors.isbn}
            placeholder="Enter ISBN"
            required
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          resetForm();
        }}
        title="Delete Book"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteBook} loading={submitting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to delete &quot;{selectedBook?.title}&quot;? This action cannot
          be undone. Note that books with existing copies cannot be deleted.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
