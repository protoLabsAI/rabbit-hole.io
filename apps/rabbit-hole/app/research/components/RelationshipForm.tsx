"use client";

/**
 * RelationshipForm Component
 *
 * Form for creating and editing relationships in the research interface.
 * Follows EntityForm patterns with dynamic field generation.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Entity, Relationship } from "@protolabsai/types";
import {
  generateRelationshipUID,
  ALL_RELATIONSHIP_TYPES,
} from "@protolabsai/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@protolabsai/ui/atoms";
import { useToast } from "@protolabsai/ui/hooks";

// Relationship form schema
const RelationshipFormSchema = z.object({
  source: z.string().min(1, "Source entity is required"),
  target: z.string().min(1, "Target entity is required"),
  type: z.string().min(1, "Relationship type is required"),
  confidence: z.number().min(0).max(1).optional().default(0.8),
  notes: z.string().optional(),
  since: z.string().optional(),
});

type RelationshipFormData = z.infer<typeof RelationshipFormSchema>;

export interface RelationshipFormProps {
  availableEntities: Entity[];
  initialData?: Partial<Relationship>;
  onSubmit: (data: Relationship) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
  preselectedSource?: string;
  preselectedTarget?: string;
}

export function RelationshipForm({
  availableEntities,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = "create",
  preselectedSource,
  preselectedTarget,
}: RelationshipFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Prepare form defaults
  const formDefaults: RelationshipFormData = {
    source: preselectedSource || initialData?.source || "",
    target: preselectedTarget || initialData?.target || "",
    type: initialData?.type || "",
    confidence: (initialData?.properties?.confidence as number) ?? 0.8,
    notes: (initialData?.properties?.notes as string) || "",
    since: (initialData?.properties?.since as string) || "",
  };

  const form = useForm({
    // Type cast required: Zod 4.x has breaking type changes that are incompatible with @hookform/resolvers@^3.10.0
    // Runtime behavior is correct, but TypeScript types don't align. Official support pending.
    // See: https://github.com/react-hook-form/resolvers/issues/705
    resolver: zodResolver(RelationshipFormSchema as any),
    defaultValues: formDefaults,
  });

  // Filter entities for source/target selection
  const entityOptions = useMemo(() => {
    return availableEntities.map((entity) => ({
      value: entity.uid,
      label: `${entity.name} (${entity.type})`,
      type: entity.type,
    }));
  }, [availableEntities]);

  // Common relationship types for dropdown
  const relationshipTypes = useMemo(() => {
    return ALL_RELATIONSHIP_TYPES.map((type) => ({
      value: type,
      label: type.replace(/_/g, " "),
    }));
  }, []);

  const handleSubmit = async (data: RelationshipFormData) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      // Generate UID if creating new relationship
      const uid =
        initialData?.uid ||
        generateRelationshipUID(
          data.source,
          data.target,
          data.type as any // RelationshipType casting
        );

      const relationship: Relationship = {
        uid,
        type: data.type,
        source: data.source,
        target: data.target,
        properties: {
          confidence: data.confidence,
          ...(data.notes && { notes: data.notes }),
          ...(data.since && { since: data.since }),
        },
      };

      await onSubmit(relationship);
    } catch (error) {
      console.error("Failed to submit relationship:", error);
      toast({
        title: "Relationship Failed",
        description: `Failed to ${mode} relationship: ${error}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSource = form.watch("source");
  const selectedTarget = form.watch("target");

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Create Relationship" : "Edit Relationship"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Define a relationship between two entities"
            : "Update relationship details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Source Entity Selection */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Entity *</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isLoading || !!preselectedSource}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source entity..." />
                      </SelectTrigger>
                      <SelectContent>
                        {entityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {option.type}
                              </Badge>
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relationship Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type *</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isLoading}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Entity Selection */}
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Entity *</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isLoading || !!preselectedTarget}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target entity..." />
                      </SelectTrigger>
                      <SelectContent>
                        {entityOptions
                          .filter((option) => option.value !== selectedSource)
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {option.type}
                                </Badge>
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confidence Score */}
            <FormField
              control={form.control}
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence Score</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      disabled={isLoading}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Confidence level from 0 (uncertain) to 1 (certain)
                  </p>
                </FormItem>
              )}
            />

            {/* Since Date */}
            <FormField
              control={form.control}
              name="since"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Since (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    When this relationship began
                  </p>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      placeholder="Additional notes about this relationship..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relationship Preview */}
            {selectedSource && selectedTarget && form.watch("type") && (
              <div className="p-4 bg-accent/50 rounded-lg border">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Relationship Preview
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    {
                      entityOptions.find((e) => e.value === selectedSource)
                        ?.label
                    }
                  </Badge>
                  <span className="text-muted-foreground">
                    {form.watch("type").replace(/_/g, " ")}
                  </span>
                  <Badge variant="outline">
                    {
                      entityOptions.find((e) => e.value === selectedTarget)
                        ?.label
                    }
                  </Badge>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={submitting || isLoading}>
                {submitting
                  ? mode === "create"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "create"
                    ? "Create Relationship"
                    : "Update Relationship"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
