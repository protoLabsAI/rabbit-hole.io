import { Icon } from "@protolabsai/icon-system";
import { Badge, Button, Input, Label } from "@protolabsai/ui/atoms";

interface ApiKeyInputProps {
  provider: string;
  label: string;
  value?: string;
  tempValue: string;
  onTempChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  showKeys: boolean;
}

export function ApiKeyInput({
  provider,
  label,
  value,
  tempValue,
  onTempChange,
  onSave,
  onClear,
  showKeys,
}: ApiKeyInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="capitalize">{label}</Label>
        {value ? (
          <Badge variant="outline" className="text-xs">
            <Icon name="CheckCircle" className="h-3 w-3 mr-1" />
            Set
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Not Set
          </Badge>
        )}
      </div>
      {value ? (
        <div className="flex gap-2">
          <Input
            type={showKeys ? "text" : "password"}
            value={value}
            disabled
            className="font-mono text-xs"
          />
          <Button variant="ghost" size="icon" onClick={onClear}>
            <Icon name="Trash2" className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type={showKeys ? "text" : "password"}
            placeholder={`Enter ${label} API key...`}
            value={tempValue}
            onChange={(e) => onTempChange(e.target.value)}
            className="font-mono text-xs"
          />
          <Button size="sm" onClick={onSave} disabled={!tempValue.trim()}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
