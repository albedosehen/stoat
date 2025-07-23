/**
 * Default Configurations for Stoat logging library
 * Defines environment-specific default settings
 * @module
 */

import type { LogLevelName } from './logLevels.ts'

/** Default configuration objects for different deployment environments (development, production, testing). */
export const DEFAULT_CONFIGS = {
  development: {
    level: 'debug' as LogLevelName,
    transports: [
      { type: 'console' as const, colors: true, prettyPrint: true },
    ],
    security: {
      enabled: true,
      sanitizeInputs: true,
    },
    performance: {
      enableAsyncLogging: false, // Sync for dev debugging
      enableSampling: false,
      enableMetrics: true,
    },
    observability: {
      enabled: false,
    },
    errorBoundary: {
      enabled: true,
      fallbackToConsole: true,
      suppressErrors: false,
    },
  },

  production: {
    level: 'info' as LogLevelName,
    transports: [
      { type: 'console' as const, colors: false, prettyPrint: false },
      {
        type: 'file' as const,
        destination: './logs/app.log',
        maxFileSize: 100 * 1024 * 1024,
        maxFiles: 10,
        compress: true,
      },
    ],
    security: {
      enabled: true,
      sanitizeInputs: true,
      maxStringLength: 5000,
    },
    performance: {
      enableAsyncLogging: true,
      enableSampling: true,
      samplingRate: 0.1,
      enableRateLimiting: true,
      rateLimit: 10000,
    },
    observability: {
      enabled: true,
      enableAutoInstrumentation: true,
    },
    errorBoundary: {
      enabled: true,
      fallbackToConsole: true,
      suppressErrors: true,
    },
  },

  testing: {
    level: 'fatal' as LogLevelName,
    transports: [
      { type: 'memory' as const, maxEntries: 100 },
    ],
    security: {
      enabled: false,
    },
    performance: {
      enableAsyncLogging: false,
      enableSampling: false,
      enableMetrics: false,
    },
    observability: {
      enabled: false,
    },
    errorBoundary: {
      enabled: true,
      fallbackToConsole: false,
      suppressErrors: true,
    },
  },
} as const

/** Type representing environment-specific configuration objects (development, production, testing). */
export type EnvironmentConfig = typeof DEFAULT_CONFIGS[keyof typeof DEFAULT_CONFIGS]
