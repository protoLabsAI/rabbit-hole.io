"use client";

/**
 * DomainFormSelector Component
 *
 * A form selector with cascading dropdowns:
 * 1. Select Domain (Social, Medical, Technology, etc.)
 * 2. Select Entity Type (filtered by domain)
 * 3. Renders EntityForm for selected type
 */

import React, { useState, useMemo } from "react";

import { domainRegistry } from "@proto/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proto/ui/atoms";

import {
  EntityType,
  getEntityTypesByDomain,
} from "../registry/DomainFormRegistry";

import { EntityForm } from "./EntityForm";

type Domain = string;

export interface DomainFormSelectorProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  requiredOnly?: boolean;
  defaultDomain?: Domain;
  defaultEntityType?: string;
  blacklistFields?: string[];
}

export function DomainFormSelector({
  onSubmit,
  onCancel,
  isLoading = false,
  requiredOnly = false,
  defaultDomain = "social",
  defaultEntityType = "Person",
  blacklistFields = [],
}: DomainFormSelectorProps) {
  const [selectedDomain, setSelectedDomain] = useState<Domain>(defaultDomain);
  const [selectedEntityType, setSelectedEntityType] =
    useState<string>(defaultEntityType);

  // Get all domains from registry
  const domains = domainRegistry.getAllDomains();
  const entityTypesByDomain = getEntityTypesByDomain();

  // Get available entity types for selected domain
  const availableEntityTypes = useMemo(() => {
    return (
      (entityTypesByDomain as Record<string, string[]>)[selectedDomain] || []
    );
  }, [selectedDomain, entityTypesByDomain]);

  // Reset entity type when domain changes
  React.useEffect(() => {
    const firstEntityType = availableEntityTypes[0];
    if (firstEntityType && !availableEntityTypes.includes(selectedEntityType)) {
      setSelectedEntityType(firstEntityType);
    }
  }, [selectedDomain, availableEntityTypes, selectedEntityType]);

  const handleDomainChange = (domain: Domain) => {
    setSelectedDomain(domain);
    // Reset entity type to first available in new domain
    const newEntityTypes =
      (entityTypesByDomain as Record<string, string[]>)[domain] || [];
    if (newEntityTypes.length > 0) {
      setSelectedEntityType(newEntityTypes[0]);
    }
  };

  // Find current domain info from registry
  const domainInfo = useMemo(() => {
    const domain = domains.find((d) => d.name === selectedDomain);
    return domain
      ? {
          name: domain.displayName,
          description: domain.description,
          icon: domain.ui.icon,
          color: domain.ui.color,
        }
      : { name: "Unknown", description: "", icon: "📦", color: "#6B7280" };
  }, [domains, selectedDomain]);

  return (
    <div className="space-y-6">
      {/* Domain and Entity Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{domainInfo.icon}</span>
            <span>Select Entity Type</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Domain Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain-select">Domain</Label>
              <Select value={selectedDomain} onValueChange={handleDomainChange}>
                <SelectTrigger id="domain-select">
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50">
                  {domains.map((domain) => (
                    <SelectItem
                      key={domain.name}
                      value={domain.name}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center space-x-2">
                        <span>{domain.ui.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {domain.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {domain.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="entity-select">Entity Type</Label>
              <Select
                value={selectedEntityType}
                onValueChange={setSelectedEntityType}
              >
                <SelectTrigger id="entity-select">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50">
                  {availableEntityTypes.map((entityType: string) => (
                    <SelectItem
                      key={entityType}
                      value={entityType}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {entityType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Form */}
      {selectedEntityType && (
        <EntityForm
          entityType={selectedEntityType as EntityType}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          requiredOnly={requiredOnly}
          blacklistFields={blacklistFields}
          mode="create"
        />
      )}
    </div>
  );
}

/**
 * Quick version with required fields only
 */
export function QuickDomainFormSelector(
  props: Omit<DomainFormSelectorProps, "requiredOnly">
) {
  return <DomainFormSelector {...props} requiredOnly={true} />;
}
