/**
 * Test Data Management Types
 *
 * System for tagging, isolating, and managing test data separately from
 * production investigation data to maintain evidence integrity.
 */

export interface TestDataConfig {
  /** Enable test data mode */
  enabled: boolean;
  /** Test session identifier for grouping related test data */
  sessionId: string;
  /** Test data prefix for easy identification */
  prefix: string;
  /** Automatic cleanup after this duration (ms) */
  autoCleanupAfter?: number;
  /** Tags to apply to all test data */
  tags: string[];
}

export interface TestDataMetadata {
  /** Whether this item is test data */
  isTestData: boolean;
  /** Test session this data belongs to */
  testSessionId?: string;
  /** When this test data was created */
  testCreatedAt?: string;
  /** When this test data expires (for auto-cleanup) */
  testExpiresAt?: string;
  /** Purpose of this test data */
  testPurpose?: string;
}

export interface TestDataFilter {
  /** Include test data in results */
  includeTestData?: boolean;
  /** Include only test data */
  testDataOnly?: boolean;
  /** Filter by specific test session */
  testSessionId?: string;
  /** Filter by test purpose */
  testPurpose?: string;
}

export interface TestDataCleanupResult {
  success: boolean;
  deletedItems: {
    evidence: number;
    nodes: number;
    edges: number;
  };
  sessions: string[];
  errors: string[];
  databaseBackend: "neo4j" | "partitions";
}

// Extended interfaces with test data support
export interface TestableEvidenceEntry {
  id: string;
  title: string;
  date: string;
  publisher: string;
  url: string;
  type?: string;
  notes?: string;
  // Test data metadata
  testData?: TestDataMetadata;
}

export interface TestableGraphNode {
  id: string;
  label: string;
  entityType: "person" | "platform" | "event" | "movement" | "media";
  dates?: {
    start?: string;
    end?: string;
  };
  aka?: string[];
  tags?: string[];
  sources: string[];
  position?: {
    x: number;
    y: number;
  };
  // Test data metadata
  testData?: TestDataMetadata;
}

export interface TestableGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  since?: string;
  until?: string;
  confidence?: number;
  type?: string;
  notes?: string;
  sources: string[];
  // Test data metadata
  testData?: TestDataMetadata;
}

// Test data generation helpers
export interface TestDataGenerator {
  /** Generate test evidence entry */
  generateEvidence(
    config: TestDataConfig,
    title: string,
    publisher?: string
  ): TestableEvidenceEntry;
  /** Generate test node */
  generateNode(
    config: TestDataConfig,
    label: string,
    entityType: string
  ): TestableGraphNode;
  /** Generate test edge */
  generateEdge(
    config: TestDataConfig,
    source: string,
    target: string,
    label: string
  ): TestableGraphEdge;
  /** Generate test session ID */
  generateSessionId(): string;
}
