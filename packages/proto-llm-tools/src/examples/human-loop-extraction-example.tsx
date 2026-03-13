"use client";

import { useState } from "react";

import { useHumanLoopExtraction } from "@proto/llm-tools/client";

/**
 * Example: Basic Human-in-the-Loop Extraction
 *
 * Demonstrates the minimal integration for interactive extraction with user review.
 */
export function BasicExtractionExample() {
  const [text, setText] = useState("");

  const {
    startExtraction,
    resumeExtraction,
    currentState,
    isStarting,
    isResuming,
    isWaitingForReview,
    currentPhase,
  } = useHumanLoopExtraction({
    onPhaseChange: (phase) => console.log("Phase changed:", phase),
  });

  const handleStart = async () => {
    await startExtraction({
      text,
      domains: ["social", "academic"],
      mode: "deep_dive",
    });
  };

  const handleApprove = async () => {
    await resumeExtraction({
      approvals: { [currentPhase || ""]: true },
    });
  };

  if (isStarting || isResuming) {
    return <div>Processing...</div>;
  }

  if (isWaitingForReview && currentState?.reviewData) {
    return (
      <div>
        <h2>Review: {currentState.reviewData.phase}</h2>
        <p>Entities: {currentState.reviewData.entities?.length || 0}</p>
        <p>
          Relationships: {currentState.reviewData.relationships?.length || 0}
        </p>
        <button onClick={handleApprove}>Approve & Continue</button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to extract entities..."
        rows={10}
        style={{ width: "100%" }}
      />
      <button onClick={handleStart} disabled={!text}>
        Start Extraction
      </button>
    </div>
  );
}

/**
 * Example: Extraction with Entity Merging
 *
 * Shows how to handle duplicate entities and merge them.
 */
export function MergeEntitiesExample() {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState<string>();

  const { resumeExtraction, currentState, isWaitingForReview } =
    useHumanLoopExtraction();

  const handleMerge = async () => {
    if (!mergeTarget || selectedEntities.length < 2) return;

    await resumeExtraction({
      merges: [
        {
          sourceUids: selectedEntities.filter((uid) => uid !== mergeTarget),
          targetUid: mergeTarget,
          mergedName:
            currentState?.reviewData?.entities?.find(
              (e) => e.uid === mergeTarget
            )?.name || "",
        },
      ],
      approvals: { discover: true },
    });
  };

  if (!isWaitingForReview || !currentState?.reviewData?.entities) {
    return null;
  }

  return (
    <div>
      <h3>Merge Duplicate Entities</h3>
      {currentState.reviewData.duplicateCandidates?.map((group, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ccc",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <p>Similarity: {Math.round(group.similarity * 100)}%</p>
          {group.entities.map((uid) => {
            const entity = currentState.reviewData?.entities?.find(
              (e) => e.uid === uid
            );
            return (
              <div key={uid}>
                <input
                  type="checkbox"
                  checked={selectedEntities.includes(uid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEntities([...selectedEntities, uid]);
                    } else {
                      setSelectedEntities(
                        selectedEntities.filter((id) => id !== uid)
                      );
                    }
                  }}
                />
                <label>
                  {entity?.name} ({entity?.type})
                </label>
                {selectedEntities.includes(uid) && (
                  <button onClick={() => setMergeTarget(uid)}>
                    {mergeTarget === uid ? "✓ Primary" : "Use as Primary"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <button
        onClick={handleMerge}
        disabled={!mergeTarget || selectedEntities.length < 2}
      >
        Merge Selected Entities
      </button>
    </div>
  );
}

/**
 * Example: Field Corrections
 *
 * Shows how to correct extracted field values.
 */
export function FieldCorrectionsExample() {
  const [corrections, setCorrections] = useState<Record<string, any>>({});

  const { resumeExtraction, currentState, isWaitingForReview, currentPhase } =
    useHumanLoopExtraction();

  const handleCorrectField = (entityUid: string, field: string, value: any) => {
    setCorrections({
      ...corrections,
      [entityUid]: {
        ...corrections[entityUid],
        [field]: value,
      },
    });
  };

  const handleApply = async () => {
    await resumeExtraction({
      corrections,
      approvals: { [currentPhase || ""]: true },
    });
  };

  if (!isWaitingForReview || !currentState?.reviewData?.entities) {
    return null;
  }

  return (
    <div>
      <h3>Correct Entity Data</h3>
      {currentState.reviewData.entities.slice(0, 5).map((entity) => (
        <div key={entity.uid} style={{ marginBottom: "1rem" }}>
          <h4>
            {entity.name} ({entity.type})
          </h4>
          {Object.entries(entity)
            .filter(([key]) => !["uid", "type", "name"].includes(key))
            .map(([key, value]) => (
              <div key={key}>
                <label>{key}:</label>
                <input
                  type="text"
                  defaultValue={String(value)}
                  onChange={(e) =>
                    handleCorrectField(entity.uid, key, e.target.value)
                  }
                />
              </div>
            ))}
        </div>
      ))}
      <button onClick={handleApply}>Apply Corrections</button>
    </div>
  );
}

/**
 * Example: Session Management
 *
 * Shows how to manage multiple extraction sessions.
 */
export function SessionManagementExample() {
  const { threadId, resetSession, loadSession, sessionInfo, currentPhase } =
    useHumanLoopExtraction();

  const [savedSessions, setSavedSessions] = useState<string[]>([]);

  const handleSaveSession = () => {
    if (threadId && !savedSessions.includes(threadId)) {
      setSavedSessions([...savedSessions, threadId]);
    }
  };

  return (
    <div>
      <h3>Session Management</h3>

      {threadId && (
        <div>
          <p>Active Session: {threadId}</p>
          <p>Phase: {currentPhase}</p>
          {sessionInfo && (
            <p>
              Entities: {sessionInfo.stats.entities}, Relationships:{" "}
              {sessionInfo.stats.relationships}
            </p>
          )}
          <button onClick={handleSaveSession}>Save Session</button>
          <button onClick={resetSession}>Reset</button>
        </div>
      )}

      {savedSessions.length > 0 && (
        <div>
          <h4>Saved Sessions</h4>
          {savedSessions.map((id) => (
            <div key={id}>
              <span>{id}</span>
              <button onClick={() => loadSession(id)}>Load</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
