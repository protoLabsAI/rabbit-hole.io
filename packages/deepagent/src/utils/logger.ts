/**
 * Deep Agent Logger
 */

const DEBUG = process.env.DEEP_AGENT_DEBUG === "true";

export const log = {
  debug: (message: string, data?: unknown) => {
    if (DEBUG) console.log(message, data);
  },
  info: (message: string) => console.log(message),
  warn: (message: string, data?: unknown) => console.warn(message, data),
  error: (message: string, error?: unknown) => console.error(message, error),
};
