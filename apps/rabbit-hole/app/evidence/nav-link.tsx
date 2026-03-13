"use client";

import Link from "next/link";

export function EvidenceNavLink() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <Link
        href="/evidence/atlas-demo"
        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg transition-colors duration-200"
      >
        🗺️ Knowledge Atlas
      </Link>
    </div>
  );
}
