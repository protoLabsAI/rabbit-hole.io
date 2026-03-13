/**
 * Research Agent Tests
 */

import { describe, test, expect } from "vitest";

import { ResearchAgentStateAnnotation } from "../state";
import { deepAgentTools } from "../tools";

describe("Research Agent", () => {
  test("state annotation includes CopilotKit", () => {
    const stateSpec = ResearchAgentStateAnnotation.spec;

    expect(stateSpec).toBeDefined();
    expect(stateSpec.copilotkit).toBeDefined();
  });

  test("state has required fields", () => {
    const stateSpec = ResearchAgentStateAnnotation.spec;

    expect(stateSpec.todos).toBeDefined();
    expect(stateSpec.files).toBeDefined();
    expect(stateSpec.confidence).toBeDefined();
    expect(stateSpec.completeness).toBeDefined();
    expect(stateSpec.entityName).toBeDefined();
    expect(stateSpec.entityType).toBeDefined();
  });

  test("tools are properly exported", () => {
    expect(deepAgentTools).toBeDefined();
    expect(deepAgentTools.length).toBeGreaterThan(0);

    const toolNames = deepAgentTools.map((t) => t.name);
    expect(toolNames).toContain("write_todos");
    expect(toolNames).toContain("write_file");
    expect(toolNames).toContain("read_file");
    expect(toolNames).toContain("ls");
  });
});
