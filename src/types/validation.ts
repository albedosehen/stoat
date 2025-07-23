/**
 * Validation Logic for Stoat logging library
 * Contains all configuration validation and normalization functions
 * @module
 */

import { LOG_LEVEL_NAMES } from './logLevels.ts'
import { TRANSPORT_TYPES } from './transports.ts'
import type { LogLevelName } from './logLevels.ts'
import type {
  AsyncTransport,
  ConsoleTransportInterface,
  FileTransport,
  MemoryTransport,
  TransportConfig,
  TransportType,
} from './transports.ts'
import type { StoatCoreConfig } from './config.ts'

/** Custom error class for configuration validation with detailed issue tracking. */
export class ConfigValidationError extends Error {
  /** Array of specific validation issues found during configuration validation. */
  public readonly issues: string[]

  /**
   * Creates a new ConfigValidationError with validation issues.
   * @param message The main error message
   * @param issues Array of specific validation issues
   */
  constructor(message: string, issues: string[] = []) {
    super(message)
    this.name = 'ConfigValidationError'
    this.issues = issues
  }
}

// Type guard functions
/** Validates that a value is a valid log level name. */
function isValidLogLevel(value: unknown): value is LogLevelName {
  return typeof value === 'string' && LOG_LEVEL_NAMES.includes(value as LogLevelName)
}

/** Validates that a value is a valid transport type. */
function isValidTransportType(value: unknown): value is TransportType {
  return typeof value === 'string' && TRANSPORT_TYPES.includes(value as TransportType)
}

/** Validates that a value is a valid rotation type for file transports. */
function isValidRotationType(value: unknown): value is 'daily' | 'hourly' | 'size' | 'none' {
  return typeof value === 'string' && ['daily', 'hourly', 'size', 'none'].includes(value)
}

/**
 * Validates and normalizes transport configuration.
 * @param transport - The transport configuration to validate
 * @returns Validated transport configuration with defaults applied
 * @throws {ConfigValidationError} When validation fails
 */
function validateTransport(transport: unknown): TransportConfig {
  const issues: string[] = []

  if (!transport || typeof transport !== 'object') {
    throw new ConfigValidationError('Transport must be an object')
  }

  const t = transport as Record<string, unknown>

  if (!isValidTransportType(t.type)) {
    issues.push(`Invalid transport type: ${t.type}. Must be one of: ${TRANSPORT_TYPES.join(', ')}`)
  }

  if (t.level !== undefined && !isValidLogLevel(t.level)) {
    issues.push(`Invalid log level: ${t.level}. Must be one of: ${LOG_LEVEL_NAMES.join(', ')}`)
  }

  if (t.enabled !== undefined && typeof t.enabled !== 'boolean') {
    issues.push('Transport enabled must be a boolean')
  }

  // Type-specific validation
  switch (t.type) {
    case 'console':
      if (t.colors !== undefined && typeof t.colors !== 'boolean') {
        issues.push('Console transport colors must be a boolean')
      }
      if (t.prettyPrint !== undefined && typeof t.prettyPrint !== 'boolean') {
        issues.push('Console transport prettyPrint must be a boolean')
      }
      break

    case 'file':
      if (!t.destination || typeof t.destination !== 'string') {
        issues.push('File transport destination is required and must be a string')
      }
      if (t.maxFileSize !== undefined && (typeof t.maxFileSize !== 'number' || t.maxFileSize <= 0)) {
        issues.push('File transport maxFileSize must be a positive number')
      }
      if (t.maxFiles !== undefined && (typeof t.maxFiles !== 'number' || t.maxFiles <= 0)) {
        issues.push('File transport maxFiles must be a positive number')
      }
      if (t.rotation !== undefined && !isValidRotationType(t.rotation)) {
        issues.push('File transport rotation must be one of: daily, hourly, size, none')
      }
      break

    case 'async':
      if (t.bufferSize !== undefined && (typeof t.bufferSize !== 'number' || t.bufferSize <= 0)) {
        issues.push('Async transport bufferSize must be a positive number')
      }
      if (t.flushInterval !== undefined && (typeof t.flushInterval !== 'number' || t.flushInterval <= 0)) {
        issues.push('Async transport flushInterval must be a positive number')
      }
      if (t.maxBufferSize !== undefined && (typeof t.maxBufferSize !== 'number' || t.maxBufferSize <= 0)) {
        issues.push('Async transport maxBufferSize must be a positive number')
      }
      break

    case 'memory':
      if (t.maxEntries !== undefined && (typeof t.maxEntries !== 'number' || t.maxEntries <= 0)) {
        issues.push('Memory transport maxEntries must be a positive number')
      }
      if (t.circular !== undefined && typeof t.circular !== 'boolean') {
        issues.push('Memory transport circular must be a boolean')
      }
      break

    case 'custom':
      if (!t.target || typeof t.target !== 'string') {
        issues.push('Custom transport target is required and must be a string')
      }
      break
  }

  if (issues.length > 0) {
    throw new ConfigValidationError('Transport validation failed', issues)
  }

  return applyTransportDefaults(t as unknown as TransportConfig)
}

/**
 * Applies default values to transport configuration based on transport type.
 * @param transport - The transport configuration to apply defaults to
 * @returns Transport configuration with type-specific defaults applied
 */
function applyTransportDefaults(transport: TransportConfig): TransportConfig {
  const base = {
    enabled: true,
    ...transport,
  }

  switch (transport.type) {
    case 'console': {
      const consoleTransport = base as ConsoleTransportInterface
      return {
        ...base,
        colors: consoleTransport.colors ?? true,
        prettyPrint: consoleTransport.prettyPrint ?? false,
      } as ConsoleTransportInterface
    }

    case 'file': {
      const fileTransport = base as FileTransport
      return {
        ...base,
        maxFileSize: fileTransport.maxFileSize ?? 100 * 1024 * 1024,
        maxFiles: fileTransport.maxFiles ?? 10,
        compress: fileTransport.compress ?? false,
        append: fileTransport.append ?? true,
        rotation: fileTransport.rotation ?? 'daily',
      } as FileTransport
    }

    case 'async': {
      const asyncTransport = base as AsyncTransport
      return {
        ...base,
        bufferSize: asyncTransport.bufferSize ?? 10000,
        flushInterval: asyncTransport.flushInterval ?? 1000,
        maxBufferSize: asyncTransport.maxBufferSize ?? 50000,
        syncOnExit: asyncTransport.syncOnExit ?? true,
      } as AsyncTransport
    }

    case 'memory': {
      const memoryTransport = base as MemoryTransport
      return {
        ...base,
        maxEntries: memoryTransport.maxEntries ?? 1000,
        circular: memoryTransport.circular ?? true,
      } as MemoryTransport
    }

    default:
      return base
  }
}

/**
 * Applies default values to the main Stoat configuration.
 * @param config - The configuration to apply defaults to
 * @returns Complete configuration with all defaults applied
 */
export function applyConfigDefaults(config: StoatCoreConfig): StoatCoreConfig {
  const defaults: StoatCoreConfig = {
    level: 'info',
    transports: [{ type: 'console', colors: true, prettyPrint: false }],
    security: {
      enabled: true,
      sanitizeInputs: true,
      redactPaths: [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        'ssn',
        'creditCard',
      ],
      redactPatterns: [
        '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
        '\\b\\d{3}-\\d{2}-\\d{4}\\b',
        'Bearer\\s+[A-Za-z0-9\\-_]+',
      ],
      maxStringLength: 10000,
      allowCircularRefs: false,
    },
    performance: {
      enableAsyncLogging: true,
      enableSampling: false,
      samplingRate: 1.0,
      enableRateLimiting: false,
      rateLimit: 1000,
      enableMetrics: true,
      metricsInterval: 60000,
      memoryThreshold: 100 * 1024 * 1024,
    },
    observability: {
      enabled: false,
      traceIdHeader: 'x-trace-id',
      spanIdHeader: 'x-span-id',
      enableAutoInstrumentation: false,
    },
    context: {
      enableAutoCorrelation: true,
      correlationIdHeader: 'x-correlation-id',
      sessionIdLength: 16,
      enableInheritance: true,
      defaultFields: {},
      maxContextSize: 1000,
      enableContextValidation: true,
    },
    plugins: {
      enabled: true,
      autoLoad: false,
      pluginPaths: [],
      enableHooks: true,
      hookTimeout: 5000,
      maxPlugins: 50,
    },
    errorBoundary: {
      enabled: true,
      fallbackToConsole: true,
      suppressErrors: false,
      maxErrorsPerMinute: 100,
    },
  }

  const mergedConfig = {
    ...defaults,
    ...config,
    security: { ...defaults.security, ...config.security },
    performance: { ...defaults.performance, ...config.performance },
    observability: { ...defaults.observability, ...config.observability },
    context: { ...defaults.context, ...config.context },
    plugins: { ...defaults.plugins, ...config.plugins },
    errorBoundary: { ...defaults.errorBoundary, ...config.errorBoundary },
  }

  // Apply transport defaults to all transports
  if (mergedConfig.transports) {
    mergedConfig.transports = mergedConfig.transports.map(applyTransportDefaults)
  }

  return mergedConfig
}

/**
 * Validates and normalizes the main Stoat configuration object.
 * @param config The configuration object to validate
 * @returns Validated and normalized configuration with defaults applied
 * @throws {ConfigValidationError} When validation fails
 */
export function validateConfig(config: unknown): StoatCoreConfig {
  const issues: string[] = []

  if (!config || typeof config !== 'object') {
    throw new ConfigValidationError('Configuration must be an object')
  }

  const c = config as Record<string, unknown>

  // Validate level
  if (c.level !== undefined && !isValidLogLevel(c.level)) {
    issues.push(`Invalid log level: ${c.level}. Must be one of: ${LOG_LEVEL_NAMES.join(', ')}`)
  }

  // Validate name and version
  if (c.name !== undefined && typeof c.name !== 'string') {
    issues.push('Name must be a string')
  }

  if (c.version !== undefined && typeof c.version !== 'string') {
    issues.push('Version must be a string')
  }

  // Validate transports
  if (c.transports !== undefined) {
    if (!Array.isArray(c.transports)) {
      issues.push('Transports must be an array')
    } else {
      try {
        c.transports = c.transports.map(validateTransport)
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          issues.push(...error.issues)
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error)
          issues.push(`Transport validation error: ${errorMessage}`)
        }
      }
    }
  }

  // Validate performance config
  if (c.performance && typeof c.performance === 'object') {
    const perf = c.performance as Record<string, unknown>
    if (perf.samplingRate !== undefined) {
      if (typeof perf.samplingRate !== 'number' || perf.samplingRate < 0 || perf.samplingRate > 1) {
        issues.push('Performance samplingRate must be a number between 0 and 1')
      }
    }
    if (perf.rateLimit !== undefined && (typeof perf.rateLimit !== 'number' || perf.rateLimit <= 0)) {
      issues.push('Performance rateLimit must be a positive number')
    }
  }

  if (issues.length > 0) {
    throw new ConfigValidationError('Configuration validation failed', issues)
  }

  return applyConfigDefaults(c as unknown as StoatCoreConfig)
}

export { applyTransportDefaults, isValidLogLevel, isValidTransportType, validateTransport }

// Re-export StoatCoreConfig to make it public for documentation
export type { StoatCoreConfig } from './config.ts'
