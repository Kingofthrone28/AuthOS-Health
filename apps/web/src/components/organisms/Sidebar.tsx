"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Paperclip,
  Phone,
  BarChart2,
  Settings,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/dashboard",    icon: LayoutDashboard },
  { label: "Cases",      href: "/cases",       icon: FolderOpen       },
  { label: "Documents",  href: "/documents",   icon: Paperclip        },
  { label: "Voice",      href: "/voice",       icon: Phone            },
  { label: "Analytics",  href: "/analytics",   icon: BarChart2        },
  { label: "Settings",   href: "/settings",    icon: Settings         },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 flex flex-col z-20" style={{ backgroundColor: "#1a2035" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 shrink-0">
        <ShieldCheck size={22} className="text-blue-400" />
        <span className="text-white font-semibold text-sm tracking-wide">AuthOS Health</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <Icon size={17} className={isActive ? "text-blue-400" : "text-gray-500"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10 shrink-0">
        <p className="text-xs text-gray-500">v0.1.0 — Phase 1</p>
      </div>
    </aside>
  );
}
