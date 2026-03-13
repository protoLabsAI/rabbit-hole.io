import { Icon } from "@proto/icon-system";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
} from "@proto/ui/atoms";

import type { ModelBrowserProps } from "../../types";

import { ModelCard } from "./ModelCard";

export function ModelBrowser({
  provider,
  category,
  models,
  loading,
  onRefresh,
  onModelSelect,
  getModelCategories,
  currentModelId,
  hasApiKey,
}: ModelBrowserProps) {
  if (!hasApiKey) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Icon
              name="AlertCircle"
              className="h-12 w-12 mx-auto mb-4 opacity-50"
            />
            <p>API key required</p>
            <p className="text-xs mt-2">Add key in API Keys tab</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Fetching models...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Available Models</CardTitle>
            <CardDescription>Live models from {provider} API</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {models.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="Info" className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click Refresh to fetch models</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {models
                .slice()
                .sort((a, b) => {
                  const aCats = getModelCategories(a.id);
                  const bCats = getModelCategories(b.id);

                  if (aCats.length > 0 && bCats.length === 0) return -1;
                  if (aCats.length === 0 && bCats.length > 0) return 1;

                  const aDesc = a.description || "";
                  const bDesc = b.description || "";
                  return bDesc.localeCompare(aDesc);
                })
                .map((model) => {
                  const assignedCategories = getModelCategories(model.id);
                  const isCurrentModel = currentModelId === model.id;

                  return (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isActive={isCurrentModel}
                      categories={assignedCategories}
                      currentCategory={category}
                      onClick={() => onModelSelect(model.id)}
                    />
                  );
                })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
