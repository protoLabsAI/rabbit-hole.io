/**
 * FamilyRelationshipCard Component - Rabbit Hole Schema
 *
 * Displays individual family relationship information with ages, status,
 * relationship details, and timeline context. Supports all family relationship
 * types: spouse, child, parent, sibling.
 */

import { getStatusEmoji } from "@proto/utils/atlas";

import { FamilyMemberLink } from "../../shared/EntityLink";

export interface FamilyMember {
  uid: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  age?: number;
  status: "living" | "deceased" | "unknown";
}

export interface FamilyRelationshipCardProps {
  relationshipType: "spouse" | "child" | "parent" | "sibling";
  member: FamilyMember;
  relationshipDate?: string;
  duration?: string;
  confidence: number;
  isCurrentSpouse?: boolean; // For marriage status indication
  onAnalyzeRelationship?: (memberUid: string, relationshipType: string) => void;
}

export function FamilyRelationshipCard({
  relationshipType,
  member,
  relationshipDate,
  duration,
  confidence,
  isCurrentSpouse = false,
  onAnalyzeRelationship,
}: FamilyRelationshipCardProps) {
  const relationshipIcons = {
    spouse: "💑",
    child: "👶",
    parent: "👨‍👧",
    sibling: "👫",
  };

  const relationshipLabels = {
    spouse: isCurrentSpouse ? "Spouse" : "Former Spouse",
    child: "Child",
    parent: "Parent",
    sibling: "Sibling",
  };

  const statusEmoji = getStatusEmoji(member.status);

  return (
    <div className="bg-white rounded-lg p-3 border border-pink-200 hover:border-pink-300 transition-colors hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-lg">{relationshipIcons[relationshipType]}</div>
          <div>
            <div className="flex items-center space-x-2">
              <FamilyMemberLink
                entityUid={member.uid}
                entityName={member.name}
              />
              <span className="text-xs" title={`Status: ${member.status}`}>
                {statusEmoji}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              {relationshipLabels[relationshipType]}
              {member.age !== undefined &&
                member.age !== null &&
                ` • Age ${member.age}`}
              {member.status === "deceased" &&
                member.deathDate &&
                ` • Died ${new Date(member.deathDate).getFullYear()}`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onAnalyzeRelationship && (
            <button
              onClick={() =>
                onAnalyzeRelationship(member.uid, relationshipType)
              }
              className="text-xs text-pink-600 hover:text-pink-800 px-2 py-1 rounded hover:bg-pink-50"
              title={`Analyze relationship with ${member.name}`}
            >
              🔍
            </button>
          )}
        </div>
      </div>

      {/* Relationship Timeline Information */}
      {relationshipDate && (
        <div className="mt-2 pt-2 border-t border-pink-100">
          <div className="text-xs text-slate-500">
            {relationshipType === "spouse" ? (
              <>
                {isCurrentSpouse ? "Married: " : "Previously married: "}
                {new Date(relationshipDate).toLocaleDateString()}
                {duration && ` • ${duration}`}
              </>
            ) : relationshipType === "child" ? (
              <>Born: {new Date(relationshipDate).toLocaleDateString()}</>
            ) : (
              <>{relationshipDate}</>
            )}
          </div>
        </div>
      )}

      {/* Confidence and Data Quality Indicators */}
      <div className="mt-1 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Confidence: {Math.round(confidence * 100)}%
        </div>
        <div className="flex items-center space-x-2">
          {member.birthDate ? (
            <div className="text-xs text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Birth date available
            </div>
          ) : (
            <div className="text-xs text-yellow-600 flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
              Birth date needed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Specialized components for different relationship types
 */

export function SpouseRelationshipCard({
  member,
  relationshipDate,
  duration,
  confidence,
  isCurrentSpouse = false,
  onAnalyzeRelationship,
}: Omit<FamilyRelationshipCardProps, "relationshipType">) {
  return (
    <FamilyRelationshipCard
      relationshipType="spouse"
      member={member}
      relationshipDate={relationshipDate}
      duration={duration}
      confidence={confidence}
      isCurrentSpouse={isCurrentSpouse}
      onAnalyzeRelationship={onAnalyzeRelationship}
    />
  );
}

export function ChildRelationshipCard({
  member,
  relationshipDate,
  confidence,
  onAnalyzeRelationship,
}: Omit<
  FamilyRelationshipCardProps,
  "relationshipType" | "duration" | "isCurrentSpouse"
>) {
  return (
    <FamilyRelationshipCard
      relationshipType="child"
      member={member}
      relationshipDate={relationshipDate}
      confidence={confidence}
      onAnalyzeRelationship={onAnalyzeRelationship}
    />
  );
}

export function ParentRelationshipCard({
  member,
  confidence,
  onAnalyzeRelationship,
}: Omit<
  FamilyRelationshipCardProps,
  "relationshipType" | "relationshipDate" | "duration" | "isCurrentSpouse"
>) {
  return (
    <FamilyRelationshipCard
      relationshipType="parent"
      member={member}
      confidence={confidence}
      onAnalyzeRelationship={onAnalyzeRelationship}
    />
  );
}

export function SiblingRelationshipCard({
  member,
  confidence,
  onAnalyzeRelationship,
}: Omit<
  FamilyRelationshipCardProps,
  "relationshipType" | "relationshipDate" | "duration" | "isCurrentSpouse"
>) {
  return (
    <FamilyRelationshipCard
      relationshipType="sibling"
      member={member}
      confidence={confidence}
      onAnalyzeRelationship={onAnalyzeRelationship}
    />
  );
}
