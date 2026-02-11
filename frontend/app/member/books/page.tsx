"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import SearchBar from "@/app/components/ui/SearchBar";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import { getBooks } from "@/app/lib/api/books-service";
import type { Book } from "@/app/types/library";

export default function BrowseBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const result = await getBooks({ is_archived: false });
        setBooks(result);
        setFilteredBooks(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch books");
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBooks(books);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author_name.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query)
    );
    setFilteredBooks(filtered);
  }, [searchQuery, books]);

  const handleViewDetails = (bookId: number) => {
    router.push(`/member/books/${bookId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Browse Books</h1>
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

        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search by title, author, or ISBN..."
          loading={false}
        />

        {loading ? (
          <LoadingSpinner text="Loading books..." />
        ) : filteredBooks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-card p-12 text-center">
            <p className="text-gray-500 text-lg">
              {searchQuery
                ? "No books found matching your search."
                : "No books available in the library."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-6 space-y-4"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    by {book.author_name}
                  </p>
                  <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Available:</span>{" "}
                    <span
                      className={
                        book.available_copies > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {book.available_copies}/{book.total_copies}
                    </span>{" "}
                    {book.available_copies === 1 ? "copy" : "copies"}
                  </p>
                </div>

                <Button
                  onClick={() => handleViewDetails(book.id)}
                  variant="primary"
                  size="md"
                  className="w-full"
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
