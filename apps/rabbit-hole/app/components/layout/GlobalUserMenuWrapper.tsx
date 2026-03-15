"use client";

import { usePathname } from "next/navigation";

import { GlobalUserMenu } from "./GlobalUserMenu";

export function GlobalUserMenuWrapper() {
  const pathname = usePathname();

  // Hidden on search page — nav is in the sidebar
  if (pathname === "/") return null;

  return (
    <div className="fixed top-2 right-4 z-50">
      <GlobalUserMenu />
    </div>
  );
}
