import type { ReactNode } from "react";
import { Sidebar } from "@/components/organisms/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      {/* Main area offset by sidebar width */}
      <div className="flex flex-col flex-1 overflow-hidden ml-56">
        {children}
      </div>
    </div>
  );
}
