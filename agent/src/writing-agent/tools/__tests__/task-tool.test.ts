/**
 * Task Tool Tests
 */

import { describe, it, expect } from "vitest";

import { taskTool } from "../task-tool.js";

describe("taskTool", () => {
  it("creates delegation message", async () => {
    const result = await taskTool.invoke(
      {
        description: "Process YouTube video and create transcript",
        subagent_type: "media-processing",
        metadata: { url: "https://youtube.com/watch?v=test" },
      },
      { toolCall: { id: "test_task" } }
    );

    expect(result.update.messages[0].content).toContain("media-processing");
    expect(result.update.messages[0].tool_call_id).toBe("test_task");
  });

  it("validates subagent_type enum", async () => {
    const schema = taskTool.schema;

    // Valid type
    const validParse = schema.safeParse({
      description: "Test task",
      subagent_type: "media-processing",
    });
    expect(validParse.success).toBe(true);

    // Invalid type
    const invalidParse = schema.safeParse({
      description: "Test task",
      subagent_type: "invalid-type",
    });
    expect(invalidParse.success).toBe(false);
  });
});
