import { toast } from "sonner";

/**
 * Centralized toast utilities for consistent notifications across the app
 */
export const Toast = {
  /**
   * Show a success message
   */
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Show an error message
   */
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 6000, // Errors stay longer
    });
  },

  /**
   * Show an info message
   */
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Show a warning message
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * Show a loading toast that can be updated
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Update a loading toast to success
   */
  updateToSuccess: (
    toastId: string | number,
    message: string,
    description?: string
  ) => {
    toast.success(message, {
      id: toastId,
      description,
      duration: 4000,
    });
  },

  /**
   * Update a loading toast to error
   */
  updateToError: (
    toastId: string | number,
    message: string,
    description?: string
  ) => {
    toast.error(message, {
      id: toastId,
      description,
      duration: 6000,
    });
  },

  /**
   * Show a custom toast with promise handling
   */
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, msgs);
  },

  /**
   * Dismiss a specific toast
   */
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

export default Toast;
