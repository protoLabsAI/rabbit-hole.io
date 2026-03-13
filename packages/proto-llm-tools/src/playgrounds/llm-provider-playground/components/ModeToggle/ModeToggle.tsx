import { Icon } from "@proto/icon-system";
import {
  Badge,
  Card,
  CardHeader,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

import type { ModeToggleProps } from "../../types";

export function ModeToggle({
  mode,
  onModeChange,
  providerStatus,
  currentProvider,
}: ModeToggleProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Mode:</Label>
            <Select value={mode} onValueChange={onModeChange}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hosted">Hosted</SelectItem>
                <SelectItem value="byok">BYOK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge
            variant={
              providerStatus[currentProvider] ? "default" : "destructive"
            }
            className="text-xs"
          >
            {providerStatus[currentProvider] ? (
              <>
                <Icon name="CheckCircle" className="h-3 w-3 mr-1" /> Ready
              </>
            ) : (
              <>
                <Icon name="AlertCircle" className="h-3 w-3 mr-1" /> Key
                Required
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}
