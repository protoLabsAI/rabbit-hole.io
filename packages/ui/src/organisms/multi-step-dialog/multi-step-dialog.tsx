"use client";

import React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../atoms/dialog";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface MultiStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: Step[];
  currentStep: string;
  onStepChange: (stepId: string) => void;
  children: React.ReactNode;
  showProgress?: boolean;
  allowClose?: boolean;
}

export function MultiStepDialog({
  open,
  onOpenChange,
  steps,
  currentStep,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStepChange: _onStepChange,
  children,
  showProgress = true,
  allowClose = true,
}: MultiStepDialogProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  if (currentStepIndex === -1) {
    console.warn(
      `MultiStepDialog: currentStep "${currentStep}" does not match any step id`
    );
    return null;
  }

  const currentStepData = steps[currentStepIndex];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => allowClose && onOpenChange(open)}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{currentStepData.title || "Dialog"}</DialogTitle>
          {currentStepData.description && (
            <DialogDescription>{currentStepData.description}</DialogDescription>
          )}
        </DialogHeader>

        {showProgress && steps.length > 1 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
            </div>
            <div className="flex gap-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index <= currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="min-h-[200px]">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

interface MultiStepDialogStepProps {
  stepId: string;
  currentStep: string;
  children: React.ReactNode;
}

export function MultiStepDialogStep({
  stepId,
  currentStep,
  children,
}: MultiStepDialogStepProps) {
  if (stepId !== currentStep) return null;
  return <>{children}</>;
}
