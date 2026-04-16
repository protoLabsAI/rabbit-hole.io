"use client";

/**
 * EntityForm Base Component
 *
 * Reusable form wrapper using shadcn/ui components with react-hook-form and zod validation.
 * Provides consistent form experience across all entity types.
 */

import React from "react";
import { useForm } from "react-hook-form";

import { generateEntityUID } from "@protolabsai/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
} from "@protolabsai/ui/atoms";

import {
  EntityType,
  getFormConfig,
  getFormConfigWithEnrichmentPriority,
  getSchema,
  validateEntity,
} from "../registry/DomainFormRegistry";

import { DynamicFormFields } from "./DynamicFormFields";

export interface EntityFormProps {
  entityType: EntityType;
  initialData?: Partial<Record<string, any>>;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
  requiredOnly?: boolean;
  blacklistFields?: string[];
  prioritizeEnrichmentFields?: boolean; // New option to prioritize enrichment fields
}

export function EntityForm({
  entityType,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  mode = "create",
  requiredOnly = false,
  blacklistFields = [],
  prioritizeEnrichmentFields = true, // Default to true for better UX
}: EntityFormProps) {
  const schema = getSchema(entityType);

  // Use enrichment-prioritized config by default (better UX)
  const formConfig = prioritizeEnrichmentFields
    ? getFormConfigWithEnrichmentPriority(entityType, blacklistFields)
    : getFormConfig(entityType, blacklistFields);

  // Generate default values based on schema and mode (excluding system fields)
  const defaultValues = React.useMemo(() => {
    const { uid, type, ...editableData } = initialData;
    const defaults: Record<string, any> = {
      name: "",
      ...editableData,
    };

    return defaults;
  }, [initialData]);

  const form = useForm({
    defaultValues,
  });

  const handleSubmit = async (data: any) => {
    try {
      // Add system fields before validation
      const completeData = {
        ...data,
        type: entityType,
        uid:
          mode === "create"
            ? generateEntityUID(entityType, data.name || "unnamed")
            : initialData.uid || data.uid,
      };

      // Validate complete data against schema
      const validation = validateEntity(entityType, completeData);
      if (!validation.success) {
        console.error("Validation failed:", validation.error);
        return;
      }

      await onSubmit(validation.data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Create" : "Edit"} {formConfig.title}
        </CardTitle>
        <CardDescription>{formConfig.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <DynamicFormFields
              formConfig={formConfig}
              form={form}
              entityType={entityType}
              requiredOnly={requiredOnly}
            />

            {/* Preview auto-generated and filtered fields */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">System-Managed Fields</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <strong>Type:</strong> {entityType}
                </Badge>
                <Badge variant="outline">
                  <strong>UID:</strong>{" "}
                  {mode === "create"
                    ? generateEntityUID(
                        entityType,
                        form.watch("name") || "[name]"
                      )
                    : initialData.uid || "[uid]"}
                </Badge>
                {blacklistFields.length > 0 && (
                  <Badge variant="secondary">
                    <strong>Filtered:</strong> {blacklistFields.join(", ")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Saving..."
                  : mode === "create"
                    ? "Create"
                    : "Update"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * Lightweight form wrapper for simple entity creation
 */
export function QuickEntityForm({
  entityType,
  onSubmit,
  onCancel,
  isLoading = false,
  requiredOnly = true,
}: Omit<EntityFormProps, "initialData" | "mode">) {
  return (
    <EntityForm
      entityType={entityType}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      mode="create"
      requiredOnly={requiredOnly}
    />
  );
}
