"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@proto/ui/atoms";

export interface BundlePreviewProps {
  bundle: any;
}

export function BundlePreview({ bundle }: BundlePreviewProps) {
  if (!bundle) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Knowledge Graph Bundle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
          <div className="rounded border p-2 text-center">
            <div className="text-xs text-muted-foreground">Evidence</div>
            <div className="text-2xl font-bold">
              {bundle.evidence?.length || 0}
            </div>
          </div>
          <div className="rounded border p-2 text-center">
            <div className="text-xs text-muted-foreground">Entities</div>
            <div className="text-2xl font-bold">
              {bundle.entities?.length || 0}
            </div>
          </div>
          <div className="rounded border p-2 text-center">
            <div className="text-xs text-muted-foreground">Relationships</div>
            <div className="text-2xl font-bold">
              {bundle.relationships?.length || 0}
            </div>
          </div>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            View Bundle JSON
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs max-h-60">
            {JSON.stringify(bundle, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
