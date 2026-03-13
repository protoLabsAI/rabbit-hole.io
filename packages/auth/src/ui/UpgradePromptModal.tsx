/**
 * UpgradePromptModal Component
 *
 * Modal displayed when a user hits their tier limit.
 * Provides clear messaging and upgrade path.
 */

"use client";

import { useRouter } from "next/navigation";

import { Button } from "@proto/ui/atoms";

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: string;
  currentValue: number;
  maxValue: number;
  tier: string;
}

export function UpgradePromptModal({
  isOpen,
  onClose,
  limitType,
  currentValue,
  maxValue,
  tier,
}: UpgradePromptModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  const getLimitLabel = (type: string) => {
    const labels: Record<string, string> = {
      entities: "Entities",
      workspaces: "Workspaces",
      rooms: "Collaboration Rooms",
      storage: "Storage",
    };
    return labels[type] || type;
  };

  const getUpgradeMessage = () => {
    if (tier === "free") {
      return "Upgrade to Basic for 10x more capacity";
    }
    if (tier === "basic") {
      return "Upgrade to Pro for 10x more capacity";
    }
    return "Upgrade for more capacity";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {getLimitLabel(limitType)} Limit Reached
          </h2>
          <p className="text-muted-foreground">
            You&apos;ve reached your {tier} tier limit of {maxValue}{" "}
            {getLimitLabel(limitType).toLowerCase()}.
          </p>
        </div>

        <div className="bg-muted rounded-md p-4 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-muted-foreground">Current Usage</span>
            <span className="text-sm font-medium text-foreground">
              {currentValue} / {maxValue}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2"
              style={{
                width: `${Math.min((currentValue / maxValue) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {getUpgradeMessage()}
        </p>

        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUpgrade} className="flex-1">
            View Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
