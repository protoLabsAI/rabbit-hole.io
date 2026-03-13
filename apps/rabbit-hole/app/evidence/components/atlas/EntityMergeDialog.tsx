/**
 * Entity Merge Dialog - Smart Entity Deduplication
 *
 * Provides intelligent entity matching and merging capabilities to consolidate
 * duplicate entities that have different IDs but represent the same real-world entity.
 */

import React, { useState, useEffect, useCallback } from "react";

import Toast from "../../../lib/toast";

interface Entity {
  uid: string;
  name: string;
  type: string;
  aliases?: string[];
  tags?: string[];
  properties?: Record<string, any>;
  // Graph-specific fields that might be present
  id?: string;
  label?: string;
  entityType?: string;
}

interface EntityMatch {
  entity: Entity;
  similarity: number;
  matchReasons: string[];
}

interface EntityMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceEntity: Entity;
  onMergeComplete: (mergedEntity: Entity) => void;
}

export function EntityMergeDialog({
  isOpen,
  onClose,
  sourceEntity,
  onMergeComplete,
}: EntityMergeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [potentialMatches, setPotentialMatches] = useState<EntityMatch[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Entity | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  // No longer need to fetch all entities - Neo4j handles the matching!

  // Load potential matches using server-side API (much simpler!)
  const loadEntitiesAndFindMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log(
        `🔍 Searching for matches for: ${sourceEntity.name} (${sourceEntity.uid})`
      );

      const response = await fetch("/api/entity-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityId: sourceEntity.uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(
        `📊 Server found ${result.matches?.length || 0} matches:`,
        result
      );

      if (result.success && result.matches) {
        setPotentialMatches(result.matches);

        // Auto-select the best match if confidence is very high
        if (result.matches.length > 0 && result.matches[0].similarity > 0.9) {
          setSelectedTarget(result.matches[0].entity);
        }
      } else {
        console.error("Match search failed:", result.error);
        setPotentialMatches([]);
      }
    } catch (error) {
      console.error("Failed to search for entity matches:", error);
      setPotentialMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [sourceEntity]);

  useEffect(() => {
    if (isOpen) {
      loadEntitiesAndFindMatches();
    }
  }, [isOpen, loadEntitiesAndFindMatches]);

  // All similarity logic is now handled by Neo4j APOC functions!

  const filteredMatches = searchQuery
    ? potentialMatches.filter(
        (match) =>
          match.entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          match.entity.aliases?.some((alias) =>
            alias.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : potentialMatches;

  const handleMerge = async () => {
    if (!selectedTarget) return;

    setIsMerging(true);
    try {
      const response = await fetch("/api/entity-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityId: sourceEntity.uid,
          targetEntityId: selectedTarget.uid,
          mergeStrategy: "smart", // Combine properties intelligently
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Merge failed");
      }

      const result = await response.json();
      onMergeComplete(result.mergedEntity);
      onClose();
    } catch (error) {
      console.error("Merge failed:", error);
      Toast.error("Merge failed", String(error));
    } finally {
      setIsMerging(false);
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity > 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (similarity > 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
    if (similarity > 0.4)
      return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">🔗</span>
              Merge Entity: {sourceEntity.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={isMerging}
            >
              ✕
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            Finding potential matches...
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Source Entity Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                Source Entity (will be merged into target)
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  {sourceEntity.type}
                </span>
                <span className="font-medium">{sourceEntity.name}</span>
                {sourceEntity.aliases && sourceEntity.aliases.length > 0 && (
                  <span className="text-gray-600">
                    • Aliases: {sourceEntity.aliases.join(", ")}
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search entities to merge with..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Potential Matches */}
            <div className="flex-1 overflow-auto">
              <h3 className="font-medium mb-3">
                Potential Matches ({filteredMatches.length})
              </h3>

              {filteredMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {potentialMatches.length === 0
                    ? "No potential matches found. This entity appears to be unique."
                    : "No matches found for your search."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMatches.map((match) => (
                    <div
                      key={match.entity.uid}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTarget?.uid === match.entity.uid
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTarget(match.entity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {match.entity.type}
                            </span>
                            <span className="font-medium">
                              {match.entity.name}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSimilarityColor(match.similarity)}`}
                            >
                              {Math.round(match.similarity * 100)}% match
                            </span>
                          </div>

                          <div className="text-xs text-gray-500 mb-2 font-mono">
                            UID: {match.entity.uid}
                          </div>

                          {match.entity.aliases &&
                            match.entity.aliases.length > 0 && (
                              <div className="text-sm text-gray-600 mb-2">
                                Aliases: {match.entity.aliases.join(", ")}
                              </div>
                            )}

                          <div className="text-sm">
                            <div className="text-gray-700 font-medium mb-1">
                              Match reasons:
                            </div>
                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                              {match.matchReasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {selectedTarget?.uid === match.entity.uid && (
                          <span className="text-blue-600 mt-1 text-lg">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedTarget && (
                  <>
                    <span className="inline text-orange-500 mr-1">⚠️</span>
                    This will merge &quot;{sourceEntity.name}&quot; into &quot;
                    {selectedTarget.name}&quot; and remove the duplicate.
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isMerging}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={!selectedTarget || isMerging}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMerging ? (
                    <>
                      <div className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Merging...
                    </>
                  ) : (
                    "Merge Entities"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
