"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content area with left margin for sidebar */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-surface shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Spacer for mobile hamburger button */}
              <div className="w-10 md:w-0" />

              {/* User info */}
              <div className="flex items-center gap-3 ml-auto">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    {role === "MEMBER" ? "Member" : "Librarian"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-semibold text-sm">
                    {user?.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
