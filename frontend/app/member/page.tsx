"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Card from "@/app/components/Card";
import { getMyProfile, getMyActiveBorrows } from "@/app/lib/api/members-service";
import type { Member, BookCopy } from "@/app/types/library";

export default function MemberPage() {
  const { isAuthenticated, role, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Member | null>(null);
  const [activeBorrows, setActiveBorrows] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (role !== "MEMBER") {
      router.push("/librarian");
    }
  }, [isAuthenticated, role, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [profileData, borrowsData] = await Promise.all([
          getMyProfile(),
          getMyActiveBorrows(),
        ]);
        setProfile(profileData);
        setActiveBorrows(borrowsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && role === "MEMBER") {
      fetchDashboardData();
    }
  }, [isAuthenticated, role]);

  if (!isAuthenticated || role !== "MEMBER") {
    return null;
  }

  const booksDueSoon = activeBorrows.filter((borrow) => {
    if (!borrow.active_transaction) return false;
    const dueDate = new Date(borrow.active_transaction.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  return (
    <DashboardLayout>
      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600">
          Manage your borrows and discover new books to read.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Active Borrows Card */}
            <Card hover>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Active Borrows</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-3">
                  {activeBorrows.length}
                </p>
                <button
                  onClick={() => router.push("/member/borrows")}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium text-left"
                >
                  View All →
                </button>
              </div>
            </Card>

            {/* Books Due Soon Card */}
            <Card hover>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Due Soon</h3>
                  {booksDueSoon.length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⚠️ {booksDueSoon.length}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-3">
                  {booksDueSoon.length}
                </p>
                <p className="text-sm text-gray-600">
                  {booksDueSoon.length === 0
                    ? "No books due within 3 days"
                    : `${booksDueSoon.length} book${booksDueSoon.length > 1 ? "s" : ""} due within 3 days`}
                </p>
              </div>
            </Card>

            {/* Total Books Borrowed Card */}
            <Card hover>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Borrowed</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-3">
                  {profile?.total_borrows_count || 0}
                </p>
                <p className="text-sm text-gray-600">All-time borrows</p>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Quick Actions
                </h3>
                <p className="text-sm text-gray-600">
                  Browse our collection and find your next great read
                </p>
              </div>
              <button
                onClick={() => router.push("/member/books")}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Browse Books
              </button>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
