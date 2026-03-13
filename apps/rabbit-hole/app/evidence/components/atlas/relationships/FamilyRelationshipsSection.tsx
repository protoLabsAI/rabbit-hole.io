/**
 * FamilyRelationshipsSection Component - Rabbit Hole Schema
 *
 * Displays comprehensive family relationship information organized by category:
 * marriages, children, parents, siblings. Includes family statistics, analysis
 * buttons, and handles loading/empty states.
 */

import { useState } from "react";

import { FamilyRelationshipCard } from "./FamilyRelationshipCard";

interface FamilyMember {
  uid: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  age?: number;
  status: "living" | "deceased" | "unknown";
}

interface FamilyMarriage {
  relationshipId: string;
  relationshipType: "MARRIED_TO" | "DIVORCED_FROM";
  partner: FamilyMember;
  marriageDate?: string;
  divorceDate?: string;
  duration?: string;
  confidence: number;
  evidence: any[];
}

interface FamilyChild {
  relationshipId: string;
  child: FamilyMember;
  birthDate?: string;
  age?: number;
  confidence: number;
  evidence: any[];
}

interface FamilyParent {
  relationshipId: string;
  parent: FamilyMember;
  relationship: "father" | "mother" | "parent";
  confidence: number;
  evidence: any[];
}

interface FamilySibling {
  relationshipId: string;
  sibling: FamilyMember;
  age?: number;
  relationship: "brother" | "sister" | "sibling";
  confidence: number;
  evidence: any[];
}

interface FamilyRelationships {
  marriages: FamilyMarriage[];
  children: FamilyChild[];
  parents: FamilyParent[];
  siblings: FamilySibling[];
  summary: {
    totalFamilyMembers: number;
    spouses: number;
    children: number;
    parents: number;
    siblings: number;
    averageAge?: number;
  };
}

export interface FamilyRelationshipsSectionProps {
  data?: FamilyRelationships;
  isLoading: boolean;
  onAnalyze?: () => void;
  onAnalyzeRelationship?: (memberUid: string, relationshipType: string) => void;
}

function FamilyLoadingState() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600 mx-auto mb-3"></div>
      <div className="text-sm text-pink-600">
        Loading family relationships...
      </div>
      <div className="text-xs text-pink-500 mt-1">
        Calculating ages and analyzing timeline
      </div>
    </div>
  );
}

function NoFamilyDataState() {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
      <div className="text-sm text-pink-600 mb-2">
        No family relationships recorded
      </div>
      <div className="text-xs text-pink-500">
        Family data may be available from additional research
      </div>
    </div>
  );
}

function FamilySection({
  title,
  emoji,
  count,
  children,
  isExpanded = true,
  onToggle,
}: {
  title: string;
  emoji: string;
  count: number;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="border border-pink-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 bg-pink-50 hover:bg-pink-100 transition-colors flex items-center justify-between"
      >
        <h5 className="text-sm font-medium text-slate-900 flex items-center">
          <span className="text-lg mr-2">{emoji}</span>
          {title} ({count})
        </h5>
        <span className="text-pink-600">{isExpanded ? "−" : "+"}</span>
      </button>
      {isExpanded && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
}

export function FamilyRelationshipsSection({
  data,
  isLoading,
  onAnalyze,
  onAnalyzeRelationship,
}: FamilyRelationshipsSectionProps) {
  const [expandedSections, setExpandedSections] = useState({
    marriages: true,
    children: true,
    parents: true,
    siblings: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) {
    return <FamilyLoadingState />;
  }

  if (!data || data.summary.totalFamilyMembers === 0) {
    return <NoFamilyDataState />;
  }

  return (
    <div className="space-y-4">
      {/* Family Summary with Analysis */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-medium">
            {data.summary.totalFamilyMembers} family member
            {data.summary.totalFamilyMembers !== 1 ? "s" : ""}
          </span>
          {" • "}
          {data.summary.spouses} spouse{data.summary.spouses !== 1 ? "s" : ""} •{" "}
          {data.summary.children} child
          {data.summary.children !== 1 ? "ren" : ""} • {data.summary.parents}{" "}
          parent{data.summary.parents !== 1 ? "s" : ""} •{" "}
          {data.summary.siblings} sibling
          {data.summary.siblings !== 1 ? "s" : ""}
          {data.summary.averageAge && (
            <> • Avg age {Math.round(data.summary.averageAge)}</>
          )}
        </div>
        {onAnalyze && (
          <button
            onClick={onAnalyze}
            className="text-xs bg-pink-100 text-pink-700 px-3 py-1 rounded hover:bg-pink-200 transition-colors"
          >
            📊 Analyze Family Network
          </button>
        )}
      </div>

      {/* Marriages/Partnerships */}
      {data.marriages.length > 0 && (
        <FamilySection
          title="Marriage"
          emoji="💑"
          count={data.marriages.length}
          isExpanded={expandedSections.marriages}
          onToggle={() => toggleSection("marriages")}
        >
          {data.marriages
            .sort((a, b) => {
              // Sort current marriages first, then by date
              const aIsCurrent = a.relationshipType === "MARRIED_TO";
              const bIsCurrent = b.relationshipType === "MARRIED_TO";
              if (aIsCurrent !== bIsCurrent) return bIsCurrent ? 1 : -1;

              if (a.marriageDate && b.marriageDate) {
                return (
                  new Date(b.marriageDate).getTime() -
                  new Date(a.marriageDate).getTime()
                );
              }
              return 0;
            })
            .map((marriage) => (
              <FamilyRelationshipCard
                key={marriage.relationshipId}
                relationshipType="spouse"
                member={marriage.partner}
                relationshipDate={marriage.marriageDate}
                duration={marriage.duration}
                confidence={marriage.confidence}
                isCurrentSpouse={marriage.relationshipType === "MARRIED_TO"}
                onAnalyzeRelationship={onAnalyzeRelationship}
              />
            ))}
        </FamilySection>
      )}

      {/* Children */}
      {data.children.length > 0 && (
        <FamilySection
          title="Children"
          emoji="👶"
          count={data.children.length}
          isExpanded={expandedSections.children}
          onToggle={() => toggleSection("children")}
        >
          {data.children
            .sort((a, b) => {
              // Sort by age descending (oldest first)
              if (a.age !== undefined && b.age !== undefined) {
                return b.age - a.age;
              }
              // If ages not available, sort by birth date
              if (a.birthDate && b.birthDate) {
                return (
                  new Date(a.birthDate).getTime() -
                  new Date(b.birthDate).getTime()
                );
              }
              return 0;
            })
            .map((child) => (
              <FamilyRelationshipCard
                key={child.relationshipId}
                relationshipType="child"
                member={child.child}
                relationshipDate={child.birthDate}
                confidence={child.confidence}
                onAnalyzeRelationship={onAnalyzeRelationship}
              />
            ))}
        </FamilySection>
      )}

      {/* Parents */}
      {data.parents.length > 0 && (
        <FamilySection
          title="Parents"
          emoji="👨‍👧"
          count={data.parents.length}
          isExpanded={expandedSections.parents}
          onToggle={() => toggleSection("parents")}
        >
          {data.parents.map((parent) => (
            <FamilyRelationshipCard
              key={parent.relationshipId}
              relationshipType="parent"
              member={parent.parent}
              confidence={parent.confidence}
              onAnalyzeRelationship={onAnalyzeRelationship}
            />
          ))}
        </FamilySection>
      )}

      {/* Siblings */}
      {data.siblings.length > 0 && (
        <FamilySection
          title="Siblings"
          emoji="👫"
          count={data.siblings.length}
          isExpanded={expandedSections.siblings}
          onToggle={() => toggleSection("siblings")}
        >
          {data.siblings
            .sort((a, b) => {
              // Sort by age descending
              if (a.age !== undefined && b.age !== undefined) {
                return b.age - a.age;
              }
              return 0;
            })
            .map((sibling) => (
              <FamilyRelationshipCard
                key={sibling.relationshipId}
                relationshipType="sibling"
                member={sibling.sibling}
                confidence={sibling.confidence}
                onAnalyzeRelationship={onAnalyzeRelationship}
              />
            ))}
        </FamilySection>
      )}

      {/* Data Quality Footer */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-xs text-slate-600">
          <div className="font-medium mb-1">Data Quality Indicators:</div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              <span>Birth date available</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
              <span>Birth date needed</span>
            </div>
            <div className="flex items-center">
              <span>🟢 Living</span>
            </div>
            <div className="flex items-center">
              <span>🔴 Deceased</span>
            </div>
            <div className="flex items-center">
              <span>⚪ Unknown</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
