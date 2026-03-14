import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// Store original console methods for restoration
const originalConsole = { ...console };

// Mock console methods to reduce test noise while preserving functionality
global.console = {
  ...console,
  log: vi.fn().mockImplementation((...args) => originalConsole.log(...args)),
  warn: vi.fn().mockImplementation((...args) => originalConsole.warn(...args)),
  error: vi
    .fn()
    .mockImplementation((...args) => originalConsole.error(...args)),
};

// Global test setup for all tests
beforeEach(() => {
  // Reset any global state between tests
  vi.clearAllMocks();
});

// Mock commonly used modules
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Comprehensive Neo4j driver mock for all tests
vi.mock("neo4j-driver", () => ({
  default: {
    driver: vi.fn(() => ({
      verifyConnectivity: vi.fn().mockResolvedValue(undefined),
      session: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ records: [] }),
        close: vi.fn().mockResolvedValue(undefined),
        beginTransaction: vi.fn(() => ({
          run: vi.fn().mockResolvedValue({ records: [] }),
          commit: vi.fn().mockResolvedValue(undefined),
          rollback: vi.fn().mockResolvedValue(undefined),
        })),
      })),
      close: vi.fn().mockResolvedValue(undefined),
    })),
    auth: {
      basic: vi.fn((username, password) => ({ username, password })),
    },
  },
  driver: vi.fn(() => ({
    verifyConnectivity: vi.fn().mockResolvedValue(undefined),
    session: vi.fn(() => ({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(undefined),
      beginTransaction: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ records: [] }),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  auth: {
    basic: vi.fn((username, password) => ({ username, password })),
  },
}));

// Mock PostgreSQL (pg) module for database tests
vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    }),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
  Client: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({
      rows: [],
      command: "SELECT",
      rowCount: 0,
      oid: 0,
      fields: [],
    }),
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
}));

// Mock file system operations for server-side tests
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock window.matchMedia for theme tests (only in jsdom environment)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Clerk has been removed — no mock needed

// Global window object enhancements (only in jsdom environment)
if (typeof window !== "undefined") {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}
