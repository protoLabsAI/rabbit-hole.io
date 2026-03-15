"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@proto/icon-system";

import type { SearchSession } from "../../hooks/useSearchSessions";

const NAV_LINKS = [
  { href: "/", icon: "Search", label: "Search" },
  { href: "/atlas", icon: "Network", label: "Atlas" },
  { href: "/research", icon: "FlaskConical", label: "Research" },
  { href: "/evidence", icon: "FileStack", label: "Evidence" },
] as const;

interface SearchSidebarProps {
  sessions: SearchSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function groupSessionsByDate(sessions: SearchSession[]) {
  const today: SearchSession[] = [];
  const yesterday: SearchSession[] = [];
  const thisWeek: SearchSession[] = [];
  const older: SearchSession[] = [];

  const now = Date.now();
  const dayMs = 86400000;

  for (const s of sessions) {
    const age = now - s.updatedAt;
    if (age < dayMs) today.push(s);
    else if (age < dayMs * 2) yesterday.push(s);
    else if (age < dayMs * 7) thisWeek.push(s);
    else older.push(s);
  }

  return { today, yesterday, thisWeek, older };
}

function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              isActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon name={link.icon as any} className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function SearchSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onToggle,
}: SearchSidebarProps) {
  const groups = groupSessionsByDate(sessions);

  const renderGroup = (label: string, items: SearchSession[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-3 pt-3 pb-1">
          {label}
        </p>
        {items.map((session) => (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectSession(session.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelectSession(session.id);
            }}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors group flex items-center gap-2 cursor-pointer ${
              session.id === activeSessionId
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon name="MessageSquare" className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate flex-1">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
            >
              <Icon name="X" className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-card border-r border-border flex flex-col transition-transform duration-200 w-64 shadow-xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <button
            onClick={onNewSession}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <Icon name="PenSquare" className="h-4 w-4" />
            New Search
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="PanelLeftClose" className="h-4 w-4" />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Your search history will appear here
            </div>
          ) : (
            <>
              {renderGroup("Today", groups.today)}
              {renderGroup("Yesterday", groups.yesterday)}
              {renderGroup("This week", groups.thisWeek)}
              {renderGroup("Older", groups.older)}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="border-t border-border px-2 py-2 space-y-0.5">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}
