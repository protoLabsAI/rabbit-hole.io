/**
 * Settings Header Component
 *
 * Header with title and close button for the settings panel
 */

import { Icon } from "@proto/icon-system";
import { Button } from "@proto/ui/atoms";

import { cn } from "@/lib/utils";

interface SettingsHeaderProps {
  onClose: () => void;
  className?: string;
}

export function SettingsHeader({ onClose, className }: SettingsHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h3 className="text-lg font-semibold text-foreground">Graph Settings</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
      >
        <Icon name="x" size={16} />
      </Button>
    </div>
  );
}
