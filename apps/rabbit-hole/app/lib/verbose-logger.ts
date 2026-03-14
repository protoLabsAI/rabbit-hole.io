/**
 * Verbose Logger
 *
 * Controlled logging utility. Verbose output enabled via
 * localStorage flag "verboseLogging".
 */

class VerboseLogger {
  private isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("verboseLogging") === "true";
    } catch {
      return false;
    }
  }

  log(message: string, data?: any) {
    if (this.isEnabled()) {
      data !== undefined ? console.log(message, data) : console.log(message);
    }
  }

  info(message: string, data?: any) {
    if (this.isEnabled()) {
      data !== undefined ? console.info(message, data) : console.info(message);
    }
  }

  warn(message: string, data?: any) {
    data !== undefined ? console.warn(message, data) : console.warn(message);
  }

  error(message: string, data?: any) {
    data !== undefined
      ? console.error(message, data)
      : console.error(message);
  }

  group(label: string) {
    if (this.isEnabled()) console.group(label);
  }

  groupEnd() {
    if (this.isEnabled()) console.groupEnd();
  }
}

export const vlog = new VerboseLogger();
