"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { Icon } from "../../atoms/icon";
import { cn } from "../../lib/utils";

interface DialogStackContextValue {
  currentStep: string | null;
  setStep: (step: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

const DialogStackContext = React.createContext<
  DialogStackContextValue | undefined
>(undefined);

interface DialogStackProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  steps: string[];
  currentStep: string | null;
  onStepChange?: (step: string) => void;
}

function DialogStack({
  steps,
  currentStep,
  onStepChange,
  ...props
}: DialogStackProps) {
  const currentStepIndex = steps.indexOf(currentStep || "");

  const setStep = (step: string) => {
    onStepChange?.(step);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    }
  };

  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoPrev = currentStepIndex > 0;

  return (
    <DialogStackContext.Provider
      value={{
        currentStep: currentStep || null,
        setStep,
        nextStep,
        prevStep,
        canGoNext,
        canGoPrev,
      }}
    >
      <DialogPrimitive.Root {...props} />
    </DialogStackContext.Provider>
  );
}
DialogStack.displayName = "DialogStack";

const useDialogStack = () => {
  const context = React.useContext(DialogStackContext);
  if (!context) {
    throw new Error("useDialogStack must be used within DialogStack");
  }
  return context;
};

interface DialogStackContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  steps?: string[];
}

const DialogStackContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogStackContentProps
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <Icon name="x" size={16} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogStackContent.displayName = "DialogStackContent";

interface DialogStackStepProps extends React.HTMLAttributes<HTMLDivElement> {
  step: string;
}

const DialogStackStep = React.forwardRef<HTMLDivElement, DialogStackStepProps>(
  ({ step, children, className, ...props }, ref) => {
    const { currentStep } = useDialogStack();

    if (step !== currentStep) {
      return null;
    }

    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);
DialogStackStep.displayName = "DialogStackStep";

export {
  DialogStack,
  DialogStackContent,
  DialogStackStep,
  useDialogStack,
  type DialogStackContextValue,
  type DialogStackProps,
  type DialogStackContentProps,
  type DialogStackStepProps,
};
