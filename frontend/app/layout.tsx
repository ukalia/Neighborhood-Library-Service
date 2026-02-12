import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/contexts/AuthContext";
import RootErrorBoundary from "@/app/components/errors/RootErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neighborhood Library Service",
  description: "Community library management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background min-h-screen`}>
        <RootErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </RootErrorBoundary>
      </body>
    </html>
  );
}
