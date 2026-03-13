"use client";

import { Badge } from "../../atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../atoms/card";

interface FieldDiff {
  field: string;
  oldValue: string | number | boolean | null | object | unknown[];
  newValue: string | number | boolean | null | object | unknown[];
  type: "added" | "removed" | "modified" | "unchanged";
}

interface DiffViewProps {
  diffs: FieldDiff[];
  title?: string;
  showUnchanged?: boolean;
}

export function DiffView({
  diffs,
  title = "Changes",
  showUnchanged = false,
}: DiffViewProps) {
  const displayDiffs = showUnchanged
    ? diffs
    : diffs.filter((d) => d.type !== "unchanged");

  // Single pass to count all diff types
  const {
    added: addedCount,
    removed: removedCount,
    modified: modifiedCount,
  } = diffs.reduce(
    (acc, diff) => {
      if (diff.type === "added") acc.added++;
      else if (diff.type === "removed") acc.removed++;
      else if (diff.type === "modified") acc.modified++;
      return acc;
    },
    { added: 0, removed: 0, modified: 0 }
  );

  if (displayDiffs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No changes detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex gap-2">
            {addedCount > 0 && (
              <Badge
                variant="default"
                className="bg-success text-success-foreground"
              >
                +{addedCount}
              </Badge>
            )}
            {modifiedCount > 0 && (
              <Badge
                variant="default"
                className="bg-warning text-warning-foreground"
              >
                ~{modifiedCount}
              </Badge>
            )}
            {removedCount > 0 && (
              <Badge
                variant="default"
                className="bg-destructive text-destructive-foreground"
              >
                -{removedCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayDiffs.map((diff, idx) => (
          <DiffField key={idx} diff={diff} />
        ))}
      </CardContent>
    </Card>
  );
}

function DiffField({ diff }: { diff: FieldDiff }) {
  const formatValue = (
    value: string | number | boolean | null | object | unknown[]
  ): string => {
    if (value === null || value === undefined || value === "") {
      return "(empty)";
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "(empty array)";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    return field
      .replace(/_/g, " ") // Handle snake_case
      .replace(/([A-Z])/g, " $1") // Handle camelCase
      .replace(/\s+/g, " ") // Normalize multiple spaces
      .trim()
      .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
  };

  if (diff.type === "unchanged") {
    return (
      <div className="flex items-start gap-3 rounded-md border-2 border-muted bg-muted/30 p-3 opacity-60">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <span className="text-xs text-muted-foreground">•</span>
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground">
            {getFieldLabel(diff.field)}
          </div>
          <div className="mt-1 text-sm text-foreground/70">
            {formatValue(diff.oldValue)}
          </div>
        </div>
      </div>
    );
  }

  if (diff.type === "added") {
    return (
      <div className="flex items-start gap-3 rounded-md border-2 border-success bg-success/20 p-3 shadow-sm">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
          <span className="text-xs font-bold text-success-foreground">+</span>
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-success">
            {getFieldLabel(diff.field)}
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {formatValue(diff.newValue)}
          </div>
        </div>
      </div>
    );
  }

  if (diff.type === "removed") {
    return (
      <div className="flex items-start gap-3 rounded-md border-2 border-destructive bg-destructive/20 p-3 shadow-sm">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
          <span className="text-xs font-bold text-destructive-foreground">
            −
          </span>
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
            {getFieldLabel(diff.field)}
          </div>
          <div className="mt-1 text-sm text-foreground/70 line-through decoration-destructive decoration-2">
            {formatValue(diff.oldValue)}
          </div>
        </div>
      </div>
    );
  }

  // Modified
  return (
    <div className="flex items-start gap-3 rounded-md border-2 border-warning bg-warning/20 p-3 shadow-sm">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning">
        <span className="text-xs font-bold text-warning-foreground">~</span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-warning">
          {getFieldLabel(diff.field)}
        </div>
        <div className="space-y-2 rounded-md bg-background/50 p-2">
          <div className="flex items-start gap-2 rounded bg-destructive/10 px-2 py-1">
            <span className="text-xs font-bold text-destructive">−</span>
            <span className="flex-1 text-sm text-foreground/70 line-through decoration-destructive">
              {formatValue(diff.oldValue)}
            </span>
          </div>
          <div className="flex items-start gap-2 rounded bg-success/10 px-2 py-1">
            <span className="text-xs font-bold text-success">+</span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {formatValue(diff.newValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function calculateDiff(
  oldData: Record<
    string,
    string | number | boolean | null | object | unknown[]
  >,
  newData: Record<string, string | number | boolean | null | object | unknown[]>
): FieldDiff[] {
  const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  const diffs: FieldDiff[] = [];

  allFields.forEach((field) => {
    const oldValue = oldData[field];
    const newValue = newData[field];

    const oldExists = field in oldData;
    const newExists = field in newData;

    // Normalize empty values for comparison
    const normalizeEmpty = (
      val: string | number | boolean | null | object | unknown[]
    ) => {
      if (val === null || val === undefined || val === "") return null;
      if (Array.isArray(val) && val.length === 0) return null;
      return val;
    };

    const normalizedOld = normalizeEmpty(oldValue);
    const normalizedNew = normalizeEmpty(newValue);

    if (!oldExists || normalizedOld === null) {
      if (newExists && normalizedNew !== null) {
        diffs.push({ field, oldValue, newValue, type: "added" });
      }
    } else if (!newExists || normalizedNew === null) {
      diffs.push({ field, oldValue, newValue, type: "removed" });
    } else {
      // Both exist, check if different
      const isDifferent =
        JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew);

      diffs.push({
        field,
        oldValue,
        newValue,
        type: isDifferent ? "modified" : "unchanged",
      });
    }
  });

  return diffs;
}
