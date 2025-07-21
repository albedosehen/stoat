/**
 * Modern configuration schema for Stoat logging library
 * @module
 */

import { z } from 'zod'
// Removed unused imports: LogLevel, SessionId, TraceId

// Environment variable configuration with STOAT_ prefix
export const STOAT_ENV_PREFIX = 'STOAT_'

// Core log levels - string names for validation, numeric values for performance
export const LOG_LEVEL_NAMES = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const

export const LOG_LEVEL_VALUES = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const

export type LogLevelName = typeof LOG_LEVEL_NAMES[number]
export type LogLevelValue = typeof LOG_LEVEL_VALUES[LogLevelName]

// Transport types for routing
export const TRANSPORT_TYPES = [
  'console',
  'file',
  'async',
  'memory',
  'custom',
] as const

export type TransportType = typeof TRANSPORT_TYPES[number]

// Base transport configuration schema
const TransportBaseSchema = z.object({
  type: z.enum(TRANSPORT_TYPES),
  level: z.enum(LOG_LEVEL_NAMES).optional(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

// Console transport specific options
const ConsoleTransportSchema = TransportBaseSchema.extend({
  type: z.literal('console'),
  colors: z.boolean().default(true),
  prettyPrint: z.boolean().default(false),
})

// File transport specific options
const FileTransportSchema = TransportBaseSchema.extend({
  type: z.literal('file'),
  destination: z.string(),
  maxFileSize: z.number().default(100 * 1024 * 1024), // 100MB
  maxFiles: z.number().default(10),
  compress: z.boolean().default(false),
  append: z.boolean().default(true),
  rotation: z.enum(['daily', 'hourly', 'size', 'none']).default('daily'),
})

// Async transport options for high-performance scenarios
const AsyncTransportSchema = TransportBaseSchema.extend({
  type: z.literal('async'),
  bufferSize: z.number().default(10000),
  flushInterval: z.number().default(1000), // milliseconds
  maxBufferSize: z.number().default(50000),
  syncOnExit: z.boolean().default(true),
  destination: z.string().optional(),
})

// Memory buffer transport for testing/debugging
const MemoryTransportSchema = TransportBaseSchema.extend({
  type: z.literal('memory'),
  maxEntries: z.number().default(1000),
  circular: z.boolean().default(true),
})

// Custom transport schema
const CustomTransportSchema = TransportBaseSchema.extend({
  type: z.literal('custom'),
  target: z.string(), // Module path or function name
  options: z.record(z.unknown()).optional(),
})

// Union of all transport schemas
const TransportSchema = z.discriminatedUnion('type', [
  ConsoleTransportSchema,
  FileTransportSchema,
  AsyncTransportSchema,
  MemoryTransportSchema,
  CustomTransportSchema,
])

// Security and redaction configuration
const SecurityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sanitizeInputs: z.boolean().default(true),
  redactPaths: z.array(z.string()).default([
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'ssn',
    'creditCard',
  ]),
  redactPatterns: z.array(z.string()).default([
    '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b', // Credit card
    '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN
    'Bearer\\s+[A-Za-z0-9\\-_]+', // Bearer tokens
  ]),
  maxStringLength: z.number().default(10000),
  allowCircularRefs: z.boolean().default(false),
})

// Performance and optimization configuration
const PerformanceConfigSchema = z.object({
  enableAsyncLogging: z.boolean().default(true),
  enableSampling: z.boolean().default(false),
  samplingRate: z.number().min(0).max(1).default(1.0),
  enableRateLimiting: z.boolean().default(false),
  rateLimit: z.number().default(1000), // logs per second
  enableMetrics: z.boolean().default(true),
  metricsInterval: z.number().default(60000), // milliseconds
  memoryThreshold: z.number().default(100 * 1024 * 1024), // 100MB
})

// OpenTelemetry integration configuration
const ObservabilityConfigSchema = z.object({
  enabled: z.boolean().default(false),
  traceIdHeader: z.string().default('x-trace-id'),
  spanIdHeader: z.string().default('x-span-id'),
  serviceName: z.string().optional(),
  serviceVersion: z.string().optional(),
  environment: z.string().optional(),
  enableAutoInstrumentation: z.boolean().default(false),
  exportEndpoint: z.string().optional(),
  exportHeaders: z.record(z.string()).optional(),
})

// Context configuration for trading and correlation
const ContextConfigSchema = z.object({
  enableAutoCorrelation: z.boolean().default(true),
  correlationIdHeader: z.string().default('x-correlation-id'),
  sessionIdLength: z.number().default(16),
  enableInheritance: z.boolean().default(true),
  defaultFields: z.record(z.unknown()).default({}),
  maxContextSize: z.number().default(1000), // Max context object size in characters
  enableContextValidation: z.boolean().default(true),
})

/**
 * Plugin configuration schema
 *
 * @property {boolean} enabled - Whether plugins are enabled
 * @property {boolean} autoLoad - Automatically load plugins from specified paths
 * @property {string[]} pluginPaths - Paths to load plugins from
 * @property {boolean} enableHooks - Enable plugin hooks
 * @property {number} hookTimeout - Timeout for plugin hooks in milliseconds
 * @property {number} maxPlugins - Maximum number of plugins to load
 */
const PluginConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoLoad: z.boolean().default(false),
  pluginPaths: z.array(z.string()).default([]),
  enableHooks: z.boolean().default(true),
  hookTimeout: z.number().default(5000), // milliseconds
  maxPlugins: z.number().default(50),
})

export const StoatConfigSchema = z.object({
  level: z.enum(LOG_LEVEL_NAMES).default('info'),
  name: z.string().optional(),
  version: z.string().optional(),

  transports: z.array(TransportSchema).default([
    { type: 'console', colors: true, prettyPrint: false },
  ]),

  security: SecurityConfigSchema.default({}),

  performance: PerformanceConfigSchema.default({}),

  observability: ObservabilityConfigSchema.default({}),

  context: ContextConfigSchema.default({}),

  plugins: PluginConfigSchema.default({}),

  errorBoundary: z.object({
    enabled: z.boolean().default(true),
    fallbackToConsole: z.boolean().default(true),
    suppressErrors: z.boolean().default(false),
    maxErrorsPerMinute: z.number().default(100),
  }).default({}),

  // Environment-specific overrides
  development: z.record(z.unknown()).optional(),
  production: z.record(z.unknown()).optional(),
  testing: z.record(z.unknown()).optional(),
})

export type StoatConfig = z.infer<typeof StoatConfigSchema>
export type TransportConfig = z.infer<typeof TransportSchema>
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>
export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>
export type ContextConfig = z.infer<typeof ContextConfigSchema>
export type PluginConfig = z.infer<typeof PluginConfigSchema>

export const ENV_VAR_MAPPING = {
  [`${STOAT_ENV_PREFIX}LEVEL`]: 'level',
  [`${STOAT_ENV_PREFIX}NAME`]: 'name',
  [`${STOAT_ENV_PREFIX}VERSION`]: 'version',

  [`${STOAT_ENV_PREFIX}SECURITY_ENABLED`]: 'security.enabled',
  [`${STOAT_ENV_PREFIX}SANITIZE_INPUTS`]: 'security.sanitizeInputs',
  [`${STOAT_ENV_PREFIX}MAX_STRING_LENGTH`]: 'security.maxStringLength',

  [`${STOAT_ENV_PREFIX}ASYNC_LOGGING`]: 'performance.enableAsyncLogging',
  [`${STOAT_ENV_PREFIX}SAMPLING_RATE`]: 'performance.samplingRate',
  [`${STOAT_ENV_PREFIX}RATE_LIMIT`]: 'performance.rateLimit',
  [`${STOAT_ENV_PREFIX}MEMORY_THRESHOLD`]: 'performance.memoryThreshold',

  [`${STOAT_ENV_PREFIX}OTEL_ENABLED`]: 'observability.enabled',
  [`${STOAT_ENV_PREFIX}SERVICE_NAME`]: 'observability.serviceName',
  [`${STOAT_ENV_PREFIX}SERVICE_VERSION`]: 'observability.serviceVersion',
  [`${STOAT_ENV_PREFIX}ENVIRONMENT`]: 'observability.environment',
  [`${STOAT_ENV_PREFIX}EXPORT_ENDPOINT`]: 'observability.exportEndpoint',

  [`${STOAT_ENV_PREFIX}AUTO_CORRELATION`]: 'context.enableAutoCorrelation',
  [`${STOAT_ENV_PREFIX}SESSION_ID_LENGTH`]: 'context.sessionIdLength',
  [`${STOAT_ENV_PREFIX}MAX_CONTEXT_SIZE`]: 'context.maxContextSize',

  [`${STOAT_ENV_PREFIX}ERROR_BOUNDARY`]: 'errorBoundary.enabled',
  [`${STOAT_ENV_PREFIX}FALLBACK_CONSOLE`]: 'errorBoundary.fallbackToConsole',
  [`${STOAT_ENV_PREFIX}SUPPRESS_ERRORS`]: 'errorBoundary.suppressErrors',
} as const

// Default configuration for different environments
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

// Type for environment-specific configs
export type EnvironmentConfig = typeof DEFAULT_CONFIGS[keyof typeof DEFAULT_CONFIGS]

// Configuration validation and normalization utilities
export function validateConfig(config: unknown): StoatConfig {
  return StoatConfigSchema.parse(config)
}

export function normalizeEnvValue(value: string): string | number | boolean {
  // Try to parse as number
  const num = Number(value)
  if (!isNaN(num)) {
    return num
  }

  // Try to parse as boolean
  const lower = value.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false

  // Return as string
  return value
}

export function getEnvVarName(configPath: string): string | undefined {
  for (const [envVar, path] of Object.entries(ENV_VAR_MAPPING)) {
    if (path === configPath) {
      return envVar
    }
  }
  return undefined
}
