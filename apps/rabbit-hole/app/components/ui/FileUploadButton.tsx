/**
 * File Upload Button Component
 *
 * A reusable button component that opens the file upload dialog.
 * Self-contained with automatic state management.
 */

import React from "react";

import { useSharedFileUpload } from "../../hooks/ui/useSharedFileUpload";

interface FileUploadButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function FileUploadButton({
  variant = "outline",
  size = "sm",
  className,
  children,
  disabled,
}: FileUploadButtonProps): React.JSX.Element {
  const fileUpload = useSharedFileUpload();

  return (
    <button
      onClick={fileUpload.openUploadDialog}
      disabled={disabled || fileUpload.isUploading}
      className={`
        inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        disabled:pointer-events-none disabled:opacity-50
        ${variant === "outline" ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" : ""}
        ${variant === "default" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
        ${variant === "secondary" ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}
        ${variant === "ghost" ? "hover:bg-accent hover:text-accent-foreground" : ""}
        ${size === "sm" ? "h-9 px-3" : size === "lg" ? "h-11 px-8" : "h-10 px-4 py-2"}
        ${className || ""}
      `}
      title="Upload files and extract metadata"
    >
      {fileUpload.isUploading ? (
        <>
          <span className="animate-spin">⚙️</span>
          <span>Uploading...</span>
        </>
      ) : (
        <>
          <span>📎</span>
          {children || <span>Upload</span>}
        </>
      )}
    </button>
  );
}
