/**
 * Confirm Popover Component
 *
 * Reusable confirmation popover for destructive actions.
 * Two-step: click trigger → popover opens → confirm/cancel
 */

"use client";

import React, { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../atoms/popover";

interface ConfirmPopoverProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmPopover({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      console.error("Confirm action failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    onCancel?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`
                px-3 py-1.5 text-sm rounded-md font-medium disabled:opacity-50
                ${
                  variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              `}
            >
              {isLoading ? "..." : confirmText}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
