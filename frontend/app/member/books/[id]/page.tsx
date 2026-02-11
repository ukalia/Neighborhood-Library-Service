"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Button from "@/app/components/ui/Button";
import Badge from "@/app/components/ui/Badge";
import Alert from "@/app/components/ui/Alert";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import { getBookById, getBookCopies } from "@/app/lib/api/books-service";
import type { Book, BookCopy } from "@/app/types/library";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);

  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchBookData = async () => {
      try {
        setLoading(true);
        const [bookData, copiesData] = await Promise.all([
          getBookById(bookId),
          getBookCopies(bookId),
        ]);
        setBook(bookData);
        setCopies(copiesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch book details");
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBookData();
    }
  }, [bookId]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Loading book details..." />
      </DashboardLayout>
    );
  }

  if (!book) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow-card p-12 text-center">
          <p className="text-gray-500 text-lg">Book not found.</p>
          <Button
            onClick={() => router.push("/member/books")}
            variant="primary"
            size="md"
            className="mt-4"
          >
            Back to Browse
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/member/books")}
            variant="secondary"
            size="sm"
          >
            ← Back
          </Button>
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

        {success && (
          <Alert
            variant="success"
            dismissible
            onDismiss={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        <div className="bg-white rounded-lg shadow-card p-8 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
            <div className="space-y-2">
              <p className="text-lg text-gray-700">
                <span className="font-medium">Author:</span> {book.author_name}
              </p>
              <p className="text-lg text-gray-700">
                <span className="font-medium">ISBN:</span> {book.isbn}
              </p>
              <p className="text-lg text-gray-700">
                <span className="font-medium">Total Copies:</span>{" "}
                {book.total_copies}
              </p>
              <p className="text-lg text-gray-700">
                <span className="font-medium">Available Copies:</span>{" "}
                <span
                  className={
                    book.available_copies > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {book.available_copies}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Book Copies
            </h2>
            {copies.length === 0 ? (
              <p className="text-gray-500">No copies available for this book.</p>
            ) : (
              <div className="space-y-3">
                {copies.map((copy) => (
                  <div
                    key={copy.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        Barcode: {copy.barcode}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={copy.status}>
                          {copy.status.charAt(0).toUpperCase() + copy.status.slice(1)}
                        </Badge>
                        {copy.borrower_name && (
                          <span className="text-xs text-gray-600">
                            Borrowed by {copy.borrower_name}
                          </span>
                        )}
                      </div>
                      {copy.active_transaction && (
                        <p className="text-xs text-gray-600">
                          Due: {new Date(copy.active_transaction.due_date).toLocaleDateString()}
                          {copy.active_transaction.is_overdue && (
                            <span className="text-red-600 ml-2">(Overdue)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
