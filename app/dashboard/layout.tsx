import React from "react";
import { Sidebar } from "@/app/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
