/**
 * ConfirmDialog Component
 *
 * A modern replacement for window.confirm() that provides better UX.
 * Integrates with the dialog system from @protolabsai/ui.
 *
 * Usage in a provider context:
 * <ConfirmDialogProvider>
 *   <YourApp />
 * </ConfirmDialogProvider>
 *
 * Then use in any component:
 * const { confirm } = useConfirmDialog();
 * if (await confirm({ title: "Delete?", description: "Cannot be undone" })) {
 *   // handle confirmation
 * }
 */

"use client";

import { createContext, useContext, useState, useCallback } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@protolabsai/ui/atoms";

export interface ConfirmDialogConfig {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
}

interface ConfirmDialogContextType {
  confirm: (config: ConfirmDialogConfig) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<
  ConfirmDialogContextType | undefined
>(undefined);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      "useConfirmDialog must be used within ConfirmDialogProvider"
    );
  }
  return context;
}

interface ConfirmDialogProviderProps {
  children: React.ReactNode;
}

export function ConfirmDialogProvider({
  children,
}: ConfirmDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmDialogConfig | null>(null);
  const [resolveCallback, setResolveCallback] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = useCallback(
    (dialogConfig: ConfirmDialogConfig): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig(dialogConfig);
        setIsOpen(true);
        setResolveCallback(() => resolve);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveCallback?.(true);
    setResolveCallback(null);
  }, [resolveCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveCallback?.(false);
    setResolveCallback(null);
  }, [resolveCallback]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      <>
        {children}
        {config && (
          <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{config.title}</DialogTitle>
                {config.description && (
                  <DialogDescription>{config.description}</DialogDescription>
                )}
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel}>
                  {config.cancelText || "Cancel"}
                </Button>
                <Button
                  variant={config.variant || "default"}
                  onClick={handleConfirm}
                >
                  {config.confirmText || "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </>
    </ConfirmDialogContext.Provider>
  );
}
