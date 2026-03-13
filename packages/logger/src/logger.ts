import pino from "pino";
import type { Logger, LoggerOptions } from "pino";

export interface LogContext {
  requestId?: string;
  userId?: string;
  tier?: string;
  route?: string;
  operation?: string;
  sessionId?: string;
  region?: string;
  [key: string]: any;
}

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  base: {
    env: process.env.NODE_ENV || "unknown",
    service: "rabbit-hole",
    version: process.env.npm_package_version || "0.1.0",
  },

  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
};

function createBaseLogger(): Logger {
  if (isTest) {
    return pino({ ...baseOptions, level: "silent" });
  }

  if (isDev) {
    return pino({
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          messageFormat: "{msg} {context}",
        },
      },
    });
  }

  return pino(baseOptions);
}

export const logger = createBaseLogger();

export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

export function createRequestLogger(
  requestId: string,
  route: string,
  userId?: string,
  tier?: string
): Logger {
  return createLogger({
    requestId,
    route,
    userId: userId || "anonymous",
    tier: tier || "unknown",
  });
}

export type { Logger };
