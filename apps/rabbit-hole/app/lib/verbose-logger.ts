/**
 * Verbose Logger
 *
 * Provides controlled logging that respects user preferences.
 * Only outputs when verboseLogging is enabled in collaboration settings.
 */

import { useCollaborationSettings } from "@/hooks/useCollaborationSettings";

class VerboseLogger {
  private isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    const settings = useCollaborationSettings.getState();
    return settings.verboseLogging;
  }

  log(message: string, data?: any) {
    if (this.isEnabled()) {
      if (data !== undefined) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }

  info(message: string, data?: any) {
    if (this.isEnabled()) {
      if (data !== undefined) {
        console.info(message, data);
      } else {
        console.info(message);
      }
    }
  }

  warn(message: string, data?: any) {
    // Warnings always show
    if (data !== undefined) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }

  error(message: string, data?: any) {
    // Errors always show
    if (data !== undefined) {
      console.error(message, data);
    } else {
      console.error(message);
    }
  }

  group(label: string) {
    if (this.isEnabled()) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isEnabled()) {
      console.groupEnd();
    }
  }
}

export const vlog = new VerboseLogger();
