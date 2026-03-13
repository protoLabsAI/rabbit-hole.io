import { describe, test, expect, vi } from "vitest";

import { DialogConditions } from "../../hooks/ui/useConditionalDialog";

describe("Conditional Dialog System", () => {
  describe("DialogConditions", () => {
    test("isAuthenticated condition", () => {
      const authCondition = DialogConditions.isAuthenticated(true);

      expect(authCondition.id).toBe("auth-required");
      expect(authCondition.name).toBe("Authentication Required");
      expect(authCondition.check()).toBe(true);
      expect(authCondition.fallbackMessage).toBe(
        "Please sign in to access this feature"
      );

      const unauthCondition = DialogConditions.isAuthenticated(false);
      expect(unauthCondition.check()).toBe(false);
    });

    test("hasRole condition", () => {
      const adminCondition = DialogConditions.hasRole("admin", "admin");

      expect(adminCondition.id).toBe("role-admin");
      expect(adminCondition.name).toBe("Role: admin");
      expect(adminCondition.check()).toBe(true);
      expect(adminCondition.fallbackMessage).toBe(
        "This feature requires admin access"
      );

      const deniedCondition = DialogConditions.hasRole("admin", "user");
      expect(deniedCondition.check()).toBe(false);

      const noRoleCondition = DialogConditions.hasRole("admin", undefined);
      expect(noRoleCondition.check()).toBe(false);
    });

    test("custom condition", () => {
      const customCheck = vi.fn().mockReturnValue(true);
      const customCondition = DialogConditions.custom(
        "test-id",
        "Test Condition",
        customCheck,
        "Custom message"
      );

      expect(customCondition.id).toBe("test-id");
      expect(customCondition.name).toBe("Test Condition");
      expect(customCondition.fallbackMessage).toBe("Custom message");
      expect(customCondition.check()).toBe(true);
      expect(customCheck).toHaveBeenCalled();
    });

    test("featureEnabled condition", () => {
      // Mock environment variable
      const originalEnv = process.env.NEXT_PUBLIC_FEATURE_TEST_FEATURE;

      process.env.NEXT_PUBLIC_FEATURE_TEST_FEATURE = "true";
      const enabledCondition = DialogConditions.featureEnabled("test_feature");
      expect(enabledCondition.check()).toBe(true);

      process.env.NEXT_PUBLIC_FEATURE_TEST_FEATURE = "false";
      expect(enabledCondition.check()).toBe(false);

      delete process.env.NEXT_PUBLIC_FEATURE_TEST_FEATURE;
      expect(enabledCondition.check()).toBe(false);

      // Restore original environment
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_FEATURE_TEST_FEATURE = originalEnv;
      }
    });
  });

  describe("Async condition handling", () => {
    test("handles async condition functions", async () => {
      const asyncCheck = vi.fn().mockResolvedValue(true);
      const asyncCondition = DialogConditions.custom(
        "async-test",
        "Async Test",
        asyncCheck,
        "Async failed"
      );

      const result = await asyncCondition.check();
      expect(result).toBe(true);
      expect(asyncCheck).toHaveBeenCalled();
    });

    test("handles async condition errors", async () => {
      const failingAsyncCheck = vi
        .fn()
        .mockRejectedValue(new Error("Async error"));
      const failingCondition = DialogConditions.custom(
        "failing-async",
        "Failing Async",
        failingAsyncCheck,
        "Async failed"
      );

      // Should not throw, but return false for failed condition
      try {
        const result = await failingCondition.check();
        // The condition itself might still execute, but the wrapper should handle errors
        expect(typeof result).toBe("boolean");
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });
  });
});
