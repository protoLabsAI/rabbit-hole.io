"use client";

/**
 * Dynamic Form Fields Component
 *
 * Renders form fields dynamically based on entity schema configuration.
 * Supports all shadcn/ui form components with proper validation.
 */

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";

import { Icon } from "@proto/icon-system";
import {
  Badge,
  Button,
  Checkbox,
  FormControl,
  FormDescription,
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
  Separator,
  Textarea,
} from "@proto/ui/atoms";

import {
  EntityType,
  FormConfig,
  FieldConfig,
} from "../registry/DomainFormRegistry";

export interface DynamicFormFieldsProps {
  formConfig: FormConfig;
  form: UseFormReturn<any>;
  entityType: EntityType;
  requiredOnly?: boolean;
  collapsibleSections?: string[]; // Section names that should be collapsible
}

export function DynamicFormFields({
  formConfig,
  form,
  entityType,
  requiredOnly = false,
  collapsibleSections = ["Advanced Fields"],
}: DynamicFormFieldsProps) {
  const { fields, sections = {} } = formConfig;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Filter fields to only required ones if requested
  const filteredFields = requiredOnly
    ? Object.fromEntries(
        Object.entries(fields).filter(([_, config]) => config.required === true)
      )
    : fields;

  // Group fields by sections or render all fields
  const fieldSections =
    Object.keys(sections).length > 0 && !requiredOnly
      ? sections
      : {
          [requiredOnly ? "Required Fields" : "Form Fields"]:
            Object.keys(filteredFields),
        };

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(fieldSections).map(
        ([sectionName, sectionFields], index) => {
          const isCollapsible = collapsibleSections.includes(sectionName);
          const isExpanded = expandedSections.has(sectionName);
          const shouldShowFields = !isCollapsible || isExpanded;

          return (
            <div key={sectionName}>
              {index > 0 && <Separator className="my-6" />}

              <div className="space-y-4">
                {/* Section Header */}
                <div
                  className={`flex items-center space-x-2 ${
                    isCollapsible ? "cursor-pointer" : ""
                  }`}
                  onClick={
                    isCollapsible ? () => toggleSection(sectionName) : undefined
                  }
                >
                  {isCollapsible && (
                    <Icon
                      name={isExpanded ? "chevron-down" : "chevron-right"}
                      size={20}
                      className="text-muted-foreground"
                    />
                  )}
                  <h3 className="text-lg font-medium">{sectionName}</h3>
                  <Badge variant="outline" className="text-xs">
                    {sectionFields.length} field
                    {sectionFields.length !== 1 ? "s" : ""}
                  </Badge>
                  {isCollapsible && !isExpanded && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Click to expand)
                    </span>
                  )}
                </div>

                {/* Section Fields */}
                {shouldShowFields && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sectionFields.map((fieldName) => {
                      const fieldConfig = filteredFields[fieldName];
                      if (!fieldConfig) return null;

                      return (
                        <DynamicFormField
                          key={fieldName}
                          name={fieldName}
                          config={fieldConfig}
                          form={form}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

interface DynamicFormFieldProps {
  name: string;
  config: FieldConfig;
  form: UseFormReturn<any>;
}

function DynamicFormField({ name, config, form }: DynamicFormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={
            config.type === "boolean"
              ? "flex flex-row items-start space-x-3 space-y-0"
              : ""
          }
        >
          <FormLabel
            className={
              config.required
                ? "after:content-['*'] after:ml-0.5 after:text-destructive"
                : ""
            }
          >
            {config.label}
          </FormLabel>

          <div className="space-y-2 flex-1">
            <FormControl>{renderFieldInput(config, field, name)}</FormControl>

            {config.description && (
              <FormDescription>{config.description}</FormDescription>
            )}

            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

function renderFieldInput(config: FieldConfig, field: any, fieldName: string) {
  switch (config.type) {
    case "string":
      return (
        <Input
          type={
            fieldName.toLowerCase().includes("password") ? "password" : "text"
          }
          placeholder={
            config.placeholder || `Enter ${config.label.toLowerCase()}`
          }
          {...field}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          placeholder={
            config.placeholder || `Enter ${config.label.toLowerCase()}`
          }
          min={config.validation?.min}
          max={config.validation?.max}
          {...field}
          onChange={(e) =>
            field.onChange(
              e.target.value ? parseFloat(e.target.value) : undefined
            )
          }
        />
      );

    case "boolean":
      return (
        <Checkbox
          checked={field.value || false}
          onCheckedChange={field.onChange}
        />
      );

    case "enum":
      return (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50">
            {config.options?.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {formatOptionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "date":
      return <Input type="date" placeholder="YYYY-MM-DD" {...field} />;

    case "array":
      return <ArrayField field={field} config={config} />;

    case "object":
      return <ObjectField field={field} config={config} />;

    default:
      return (
        <Input
          placeholder={
            config.placeholder || `Enter ${config.label.toLowerCase()}`
          }
          {...field}
        />
      );
  }
}

function ArrayField({ field, config }: { field: any; config: FieldConfig }) {
  const [inputValue, setInputValue] = React.useState("");
  const values = field.value || [];

  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      field.onChange([...values, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeValue = (valueToRemove: string) => {
    field.onChange(values.filter((v: string) => v !== valueToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <Input
          placeholder={`Add ${config.label.toLowerCase().slice(0, -1)}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && (e.preventDefault(), addValue())
          }
        />
        <Button type="button" onClick={addValue} size="sm">
          Add
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((value: string, index: number) => (
            <Badge key={index} variant="secondary" className="cursor-pointer">
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectField({ field, config }: { field: any; config: FieldConfig }) {
  // For now, render as JSON textarea - can be enhanced for specific object types
  return (
    <Textarea
      placeholder={`Enter ${config.label.toLowerCase()} as JSON`}
      value={field.value ? JSON.stringify(field.value, null, 2) : ""}
      onChange={(e) => {
        try {
          const parsed = e.target.value
            ? JSON.parse(e.target.value)
            : undefined;
          field.onChange(parsed);
        } catch {
          // Invalid JSON - keep the text value for user to fix
        }
      }}
      rows={4}
    />
  );
}

function formatOptionLabel(option: string): string {
  return option.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
