import { Icon } from "@proto/icon-system";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Switch,
} from "@proto/ui/atoms";

import { PROVIDER_LABELS } from "../../constants";
import type { ApiKeyManagerProps } from "../../types";

import { ApiKeyInput } from "./ApiKeyInput";

export function ApiKeyManager({
  apiMode,
  apiKeys,
  tempKey,
  onTempKeyChange,
  showKeys,
  onShowKeysChange,
  onSaveKey,
  onClearKey,
}: ApiKeyManagerProps) {
  if (apiMode === "hosted") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys (BYOK Mode)</CardTitle>
          <CardDescription>
            Using hosted API keys - no setup required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Icon
              name="CheckCircle"
              className="h-12 w-12 mx-auto mb-4 text-primary"
            />
            <p className="font-medium">Hosted Mode Active</p>
            <p className="text-sm text-muted-foreground mt-2">
              Using server-side API keys - usage will be tracked and billed
            </p>
            <Badge variant="outline" className="mt-4">
              Switch to BYOK mode to use your own keys
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const providers = [
    "openai",
    "anthropic",
    "google",
    "groq",
    "ollama",
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Keys (BYOK Mode)</CardTitle>
        <CardDescription>
          Bring your own keys - stored in memory only
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map((provider) => (
          <ApiKeyInput
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider] || provider}
            value={apiKeys[provider]}
            tempValue={tempKey}
            onTempChange={onTempKeyChange}
            onSave={() => {
              onSaveKey(provider);
              onTempKeyChange("");
            }}
            onClear={() => onClearKey(provider)}
            showKeys={showKeys}
          />
        ))}

        <div className="flex items-center justify-between pt-4">
          <Label>Show API Keys</Label>
          <Switch checked={showKeys} onCheckedChange={onShowKeysChange} />
        </div>
      </CardContent>
    </Card>
  );
}
