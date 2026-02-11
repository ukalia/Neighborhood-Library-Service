"use client";

import { ReactNode } from "react";

interface BadgeProps {
  variant?: "available" | "borrowed" | "overdue" | "lost" | "maintenance" | "active" | "inactive" | "success" | "warning" | "info" | "danger" | "default";
  children: ReactNode;
  className?: string;
}

export default function Badge({
  variant = "available",
  children,
  className = "",
}: BadgeProps) {
  const variantStyles = {
    available: "bg-green-100 text-green-800 border-green-200",
    borrowed: "bg-blue-100 text-blue-800 border-blue-200",
    overdue: "bg-red-100 text-red-800 border-red-200",
    lost: "bg-gray-100 text-gray-800 border-gray-300",
    maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
    active: "bg-green-100 text-green-800 border-green-200",
    inactive: "bg-gray-100 text-gray-800 border-gray-300",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    default: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <span
      role="status"
      aria-label={`Status: ${children}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
