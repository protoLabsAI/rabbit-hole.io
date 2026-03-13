/**
 * Validation Feedback Components
 *
 * Reusable components for showing validation states, errors, and success messages
 */

import { Icon } from "@proto/icon-system";
import type { RegisteredIconName } from "@proto/icon-system";

import { cn } from "@/lib/utils";

interface ValidationMessageProps {
  message: string;
  type: "error" | "success" | "warning" | "info";
  className?: string;
}

export function ValidationMessage({
  message,
  type,
  className,
}: ValidationMessageProps) {
  const iconMap: Record<string, RegisteredIconName> = {
    error: "alert-circle",
    success: "check-circle",
    warning: "alert-circle",
    info: "info",
  };

  const colorMap = {
    error: "text-red-600 dark:text-red-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  const iconName = iconMap[type];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs mt-1",
        colorMap[type],
        className
      )}
    >
      <Icon name={iconName} size={12} className="flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface FieldValidationProps {
  fieldName: string;
  value: any;
  errors?: string[];
  isValid?: boolean;
  showSuccess?: boolean;
  className?: string;
}

export function FieldValidation({
  fieldName,
  value,
  errors = [],
  isValid = false,
  showSuccess = true,
  className,
}: FieldValidationProps) {
  const hasValue = value !== undefined && value !== null && value !== "";
  const hasErrors = errors.length > 0;

  if (!hasValue && !hasErrors) return null;

  return (
    <div className={cn("space-y-1", className)}>
      {hasErrors &&
        errors.map((error, index) => (
          <ValidationMessage key={index} message={error} type="error" />
        ))}

      {!hasErrors && isValid && showSuccess && hasValue && (
        <ValidationMessage
          message={`Valid ${fieldName.toLowerCase()}`}
          type="success"
        />
      )}
    </div>
  );
}

interface RangeValidationProps {
  value: number;
  min: number;
  max: number;
  unit?: string;
  optimal?: { min: number; max: number };
  className?: string;
}

export function RangeValidation({
  value,
  min,
  max,
  unit = "",
  optimal,
  className,
}: RangeValidationProps) {
  const isValid = value >= min && value <= max;
  const isOptimal = optimal
    ? value >= optimal.min && value <= optimal.max
    : true;

  if (isValid && isOptimal) {
    return (
      <ValidationMessage
        message={`Good choice: ${value}${unit}`}
        type="success"
        className={className}
      />
    );
  }

  if (isValid && !isOptimal) {
    return (
      <ValidationMessage
        message={`Consider ${optimal?.min}-${optimal?.max}${unit} for better performance`}
        type="warning"
        className={className}
      />
    );
  }

  if (!isValid) {
    return (
      <ValidationMessage
        message={`Must be between ${min}-${max}${unit}`}
        type="error"
        className={className}
      />
    );
  }

  return null;
}

interface DateRangeValidationProps {
  fromDate: string;
  toDate: string;
  className?: string;
}

export function DateRangeValidation({
  fromDate,
  toDate,
  className,
}: DateRangeValidationProps) {
  if (!fromDate || !toDate) return null;

  const from = new Date(fromDate);
  const to = new Date(toDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return (
      <ValidationMessage
        message="Invalid date format"
        type="error"
        className={className}
      />
    );
  }

  // Check if from is before to
  if (from >= to) {
    return (
      <ValidationMessage
        message="Start date must be before end date"
        type="error"
        className={className}
      />
    );
  }

  // Check if dates are in the future
  if (from > now || to > now) {
    return (
      <ValidationMessage
        message="Future dates may have limited data"
        type="warning"
        className={className}
      />
    );
  }

  // Calculate date range
  const daysDiff = Math.ceil(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff > 365) {
    return (
      <ValidationMessage
        message={`Large time range (${daysDiff} days) may impact performance`}
        type="warning"
        className={className}
      />
    );
  }

  return (
    <ValidationMessage
      message={`${daysDiff} day${daysDiff !== 1 ? "s" : ""} selected`}
      type="success"
      className={className}
    />
  );
}
