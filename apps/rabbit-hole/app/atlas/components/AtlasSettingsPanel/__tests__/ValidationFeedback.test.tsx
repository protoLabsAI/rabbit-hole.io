/**
 * Validation Feedback Components Tests
 *
 * Tests for the advanced form validation system
 */

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";

import {
  ValidationMessage,
  FieldValidation,
  RangeValidation,
  DateRangeValidation,
} from "../ValidationFeedback";

describe.skip("ValidationMessage", () => {
  it("renders error messages correctly", () => {
    render(<ValidationMessage message="Test error message" type="error" />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("renders success messages correctly", () => {
    render(<ValidationMessage message="Test success message" type="success" />);
    expect(screen.getByText("Test success message")).toBeInTheDocument();
  });
});

describe.skip("RangeValidation", () => {
  it("shows success for values in optimal range", () => {
    render(
      <RangeValidation
        value={2}
        min={1}
        max={10}
        optimal={{ min: 1, max: 3 }}
        unit=" hops"
      />
    );
    expect(screen.getByText("Good choice: 2 hops")).toBeInTheDocument();
  });

  it("shows warning for values outside optimal range", () => {
    render(
      <RangeValidation
        value={5}
        min={1}
        max={10}
        optimal={{ min: 1, max: 3 }}
        unit=" hops"
      />
    );
    expect(
      screen.getByText("Consider 1-3 hops for better performance")
    ).toBeInTheDocument();
  });

  it("shows error for values outside valid range", () => {
    render(<RangeValidation value={15} min={1} max={10} unit=" hops" />);
    expect(screen.getByText("Must be between 1-10 hops")).toBeInTheDocument();
  });
});

describe.skip("DateRangeValidation", () => {
  it("shows success for valid date range", () => {
    render(<DateRangeValidation fromDate="2024-01-01" toDate="2024-01-10" />);
    expect(screen.getByText("9 days selected")).toBeInTheDocument();
  });

  it("shows error for invalid date order", () => {
    render(<DateRangeValidation fromDate="2024-01-10" toDate="2024-01-01" />);
    expect(
      screen.getByText("Start date must be before end date")
    ).toBeInTheDocument();
  });

  it("shows warning for large date ranges", () => {
    render(<DateRangeValidation fromDate="2023-01-01" toDate="2024-12-31" />);
    expect(
      screen.getByText(/Large time range.*may impact performance/)
    ).toBeInTheDocument();
  });
});

describe.skip("FieldValidation", () => {
  it("shows success for valid fields", () => {
    render(
      <FieldValidation
        fieldName="Test Field"
        value="test value"
        isValid={true}
      />
    );
    expect(screen.getByText("Valid test field")).toBeInTheDocument();
  });

  it("shows errors for invalid fields", () => {
    render(
      <FieldValidation
        fieldName="Test Field"
        value=""
        errors={["Field is required"]}
      />
    );
    expect(screen.getByText("Field is required")).toBeInTheDocument();
  });

  it("does not render when field has no value and no errors", () => {
    const { container } = render(
      <FieldValidation fieldName="Test Field" value="" isValid={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
