/**
 * Tier Limit Warning Component
 *
 * Displays current usage, incoming entities, and validation status.
 * Uses traffic light colors: green < 80%, yellow 80-99%, red >= 100%
 */

"use client";

import { Alert, AlertDescription, AlertTitle } from "@proto/ui/atoms";

interface TierLimitWarningProps {
  usage: {
    entities: number;
    relationships: number;
  };
  incoming: {
    entities: number;
    relationships: number;
  };
  limits: {
    maxEntities: number;
    maxRelationships: number;
  };
  tier: string;
}

export function TierLimitWarning({
  usage,
  incoming,
  limits,
  tier,
}: TierLimitWarningProps) {
  const afterEntities = usage.entities + incoming.entities;
  const afterRelationships = usage.relationships + incoming.relationships;

  const entityPercent =
    limits.maxEntities === -1 ? 0 : (afterEntities / limits.maxEntities) * 100;

  const relationshipPercent =
    limits.maxRelationships === -1
      ? 0
      : (afterRelationships / limits.maxRelationships) * 100;

  const wouldExceedEntities =
    limits.maxEntities !== -1 && afterEntities > limits.maxEntities;
  const wouldExceedRelationships =
    limits.maxRelationships !== -1 &&
    afterRelationships > limits.maxRelationships;

  const isWarning =
    (entityPercent >= 80 && entityPercent < 100) ||
    (relationshipPercent >= 80 && relationshipPercent < 100);
  const isBlocked = wouldExceedEntities || wouldExceedRelationships;

  // Unlimited tier (both entities and relationships)
  if (limits.maxEntities === -1 && limits.maxRelationships === -1) {
    return (
      <Alert variant="success">
        <AlertTitle>Unlimited Capacity Available</AlertTitle>
        <AlertDescription>
          Your {tier.toUpperCase()} tier has unlimited entity and relationship
          capacity.
        </AlertDescription>
      </Alert>
    );
  }

  // Blocked state
  if (isBlocked) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Import Would Exceed Limit</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            {wouldExceedEntities && (
              <div>
                <strong>Entities:</strong> {usage.entities} +{" "}
                {incoming.entities} = {afterEntities} / {limits.maxEntities}
                <span className="text-destructive font-semibold ml-2">
                  (exceeds by {afterEntities - limits.maxEntities})
                </span>
              </div>
            )}
            {wouldExceedRelationships && (
              <div>
                <strong>Relationships:</strong> {usage.relationships} +{" "}
                {incoming.relationships} = {afterRelationships} /{" "}
                {limits.maxRelationships}
                <span className="text-destructive font-semibold ml-2">
                  (exceeds by {afterRelationships - limits.maxRelationships})
                </span>
              </div>
            )}
            <div className="mt-2 pt-2 border-t">
              Reduce hops/node limit or{" "}
              <a href="/pricing" className="underline font-semibold">
                upgrade to {tier === "free" ? "BASIC" : "a higher tier"}
              </a>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Warning state
  if (isWarning) {
    const entitiesDisplay =
      limits.maxEntities === -1
        ? "Unlimited"
        : `${afterEntities} / ${limits.maxEntities}`;
    const relationshipsDisplay =
      limits.maxRelationships === -1
        ? "Unlimited"
        : `${afterRelationships} / ${limits.maxRelationships}`;

    return (
      <Alert variant="warning">
        <AlertTitle>Approaching Limit</AlertTitle>
        <AlertDescription>
          <div>
            <strong>Entities:</strong> {usage.entities} → {entitiesDisplay}
            {limits.maxEntities !== -1 && ` (${entityPercent.toFixed(0)}%)`}
          </div>
          <div>
            <strong>Relationships:</strong> {usage.relationships} →{" "}
            {relationshipsDisplay}
            {limits.maxRelationships !== -1 &&
              ` (${relationshipPercent.toFixed(0)}%)`}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // OK state
  const entitiesDisplay =
    limits.maxEntities === -1
      ? "Unlimited"
      : `${afterEntities} / ${limits.maxEntities}`;
  const relationshipsDisplay =
    limits.maxRelationships === -1
      ? "Unlimited"
      : `${afterRelationships} / ${limits.maxRelationships}`;

  return (
    <Alert variant="success">
      <AlertTitle>Within Limits</AlertTitle>
      <AlertDescription>
        <div>
          <strong>Entities:</strong> {usage.entities} → {entitiesDisplay}
        </div>
        <div>
          <strong>Relationships:</strong> {usage.relationships} →{" "}
          {relationshipsDisplay}
        </div>
      </AlertDescription>
    </Alert>
  );
}
