/**
 * JSON structured logger for Stoat
 *
 * Provides structured log entries with standardized fields and serialization.
 * Supports observability, performance metrics, and extensible serialization options.
 * @module
 */

import type { LogMessage, RequestId, SpanId, Timestamp, TraceId } from '../types/brands.ts'
import type { StoatContext } from '../stoat/context.ts'
import type { LogLevelName, LogLevelValue } from '../types/logLevels.ts'
import { LOG_LEVEL_VALUES } from '../types/logLevels.ts'
import { CircularReferenceError, createErrorContext, SerializationError } from '../errors/errors.ts'

/**
 * Represents a structured log entry used in Stoat's logging system.
 *
 * StructuredLogEntry captures standard log details (level, message, timestamp),
 * contextual observability data (trace IDs, service info), optional error and
 * performance metadata, and extensible custom fields for enriched logging.
 */
export interface StructuredLogEntry {
  /** ISO 8601 timestamp of when the log entry was created */
  readonly timestamp: Timestamp

  /** Log level name (e.g. "info", "error", etc.) */
  readonly level: LogLevelName

  /** Numeric value of the log level (e.g. 100, 200) */
  readonly levelValue: LogLevelValue

  /** Main log message */
  readonly message: LogMessage

  // ── Observability ─────────────────────────────

  /** Distributed tracing trace ID, if available */
  readonly traceId?: TraceId

  /** Span ID for distributed tracing, if available */
  readonly spanId?: SpanId

  /** Correlation or request ID for the current operation */
  readonly requestId?: RequestId

  // ── Context ───────────────────────────────────

  /** Name of the service generating the log */
  readonly service?: string

  /** Version of the service or application */
  readonly version?: string

  /** Deployment environment (e.g. "prod", "dev", "staging") */
  readonly environment?: string

  /** Subsystem or component emitting the log */
  readonly component?: string

  /** Logical module or file name */
  readonly module?: string

  /** Function name where the log originated */
  readonly function?: string

  // ── Structured Data ───────────────────────────

  /** Arbitrary structured payload (e.g. request or domain data) */
  readonly data?: unknown

  /** Structured error details, including message and optional stack */
  readonly error?: StructuredError

  /** Application-specific observability context */
  readonly context?: StoatContext

  /** Key-value pairs for semantic labels (e.g. "userId": "123") */
  readonly labels?: Record<string, string>

  /** List of tags for categorization or filtering */
  readonly tags?: string[]

  // ── Performance ───────────────────────────────

  /** Duration in milliseconds for the logged operation */
  readonly duration?: number

  /** Memory usage in bytes at the time of logging */
  readonly memoryUsage?: number

  /** CPU usage percentage or metric */
  readonly cpuUsage?: number

  // ── Metadata ──────────────────────────────────

  /** Additional metadata not captured by other fields */
  readonly metadata?: Record<string, unknown>

  // ── Extensible ────────────────────────────────

  /** User-defined custom fields for extended logging */
  readonly custom?: Record<string, unknown>
}

/**
 * Represents a structured error used in log entries.
 *
 * Captures detailed error information such as name, message, stack trace,
 * optional error codes, nested causes, and additional metadata.
 */
export interface StructuredError {
  /** Error name (e.g. "TypeError", "ValidationError") */
  name: string

  /** Human-readable error message */
  message: string

  /** Stack trace string, if available */
  stack?: string

  /** Optional error code (e.g. "E_INVALID_INPUT") */
  code?: string

  /** Nested cause of the error, if applicable */
  cause?: StructuredError

  /** Additional error details or context */
  details?: Record<string, unknown>
}

/**
 * Configuration options for serializing structured log entries.
 *
 * Allows customization of depth limits, formatting style, field exclusion,
 * and how log levels and timestamps are represented.
 */
export interface SerializationOptions {
  /** Whether to pretty-print the serialized output (adds whitespace and indentation) */
  pretty?: boolean

  /** Maximum depth to traverse when serializing nested objects */
  maxDepth?: number

  /** Maximum number of array elements to include */
  maxArrayLength?: number

  /** Maximum string length before truncation */
  maxStringLength?: number

  /** Whether to include error stack traces (if available) */
  includeStackTrace?: boolean

  /** List of field names to exclude from the serialized output */
  excludeFields?: string[]

  /** Custom fields to inject into the log entry during serialization */
  customFields?: Record<string, unknown>

  /** Format used for timestamps: ISO string, Unix timestamp, or epoch milliseconds */
  timestampFormat?: 'iso' | 'unix' | 'epoch'

  /** Format used for log levels: string ("info"), number (100), or both */
  levelFormat?: 'string' | 'number' | 'both'

  /** List of sensitive field paths to redact during serialization */
  sensitiveFields?: string[]

  /** Pattern to use for redacting sensitive data */
  redactionPattern?: string
}

/**
 * Field mapping configuration for transforming structured log entries.
 *
 * Allows customization of field names in the serialized output, enabling alignment
 * with external systems, log aggregators, or schema conventions.
 */
export interface FieldMapping {
  /** Custom key name for the timestamp field */
  timestamp?: string

  /** Custom key name for the log level field */
  level?: string

  /** Custom key name for the log message field */
  message?: string

  /** Custom key name for the trace ID field (observability) */
  traceId?: string

  /** Custom key name for the span ID field (observability) */
  spanId?: string

  /** Custom key name for the structured data field */
  data?: string

  /** Custom key name for the error field */
  error?: string

  /** Custom key name for the context field */
  context?: string
}

/**
 * Structured logger class
 *
 * Provides methods to create and serialize log entries with support for
 * circular reference detection, custom field injection, and depth limits.
 *
 * @class
 * @param {SerializationOptions} [options] - Optional serialization options
 * @throws {CircularReferenceError} If circular references are detected during serialization
 * @throws {SerializationError} If serialization fails due to invalid data or other issues
 *
 * @example
 * const logger = new StructuredLogger({ pretty: true, maxDepth: 5 });
 * const entry = logger.createLogEntry({
 *   level: 'info',
 *   message: 'Test log entry',
 *   data: { key: 'value' },
 *   context: { userId: '123', organizationId: '456' },
 * });
 * const serialized = logger.serialize(entry);
 * console.log(serialized);
 * // Output: JSON string representation of the structured log entry
 */
export class StructuredLogger {
  private circularRefs = new Set<object>()
  private defaultOptions: Required<SerializationOptions>
  private totalEntries = 0
  private errorCount = 0
  private serializationTimes: number[] = []
  private processingTimes: number[] = []

  constructor(options: SerializationOptions = {}) {
    this.defaultOptions = {
      pretty: false,
      maxDepth: 10,
      maxArrayLength: 1000,
      maxStringLength: 10000,
      includeStackTrace: true,
      excludeFields: [],
      customFields: {},
      timestampFormat: 'iso',
      levelFormat: 'string',
      sensitiveFields: [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        'ssn',
        'creditCard',
        'sensitive',
      ],
      redactionPattern: '[REDACTED]',
      ...options,
    }
  }

  /**
   * Creates a new structured log entry with the specified components.
   *
   * @param {Object} args - Arguments for creating the log entry.
   * @param {LogLevelName} args.level - Log level name.
   * @param {string} args.message - Log message.
   * @param {unknown} [args.data] - Optional structured data.
   * @param {Error} [args.error] - Optional error object.
   * @param {StoatContext} [args.context] - Optional Stoat context for observability.
   * @param {Partial<SerializationOptions>} [args.options] - Optional serialization overrides.
   * @returns {StructuredLogEntry} The structured log entry.
   */
  createLogEntry({
    level,
    message,
    data,
    error,
    context,
    options = {},
  }: {
    level: LogLevelName
    message: string
    data?: unknown
    error?: Error
    context?: StoatContext
    options?: Partial<SerializationOptions>
  }): StructuredLogEntry {
    const startTime = performance.now()
    const opts = { ...this.defaultOptions, ...options }

    const entry: StructuredLogEntry = {
      timestamp: this.createTimestamp(opts.timestampFormat),
      level,
      levelValue: LOG_LEVEL_VALUES[level],
      message: message as LogMessage,

      traceId: context?.traceId,
      spanId: context?.spanId,
      requestId: context?.requestId,

      service: context?.metadata?.service as string,
      version: context?.version,
      environment: context?.environment,
      component: context?.component,
      module: context?.module,
      function: context?.function,

      data: data ? this.sanitizeData(data, opts) : data,
      error: error ? this.serializeError(error, opts) : undefined,
      context: context,

      labels: this.extractLabels(context),
      tags: context?.tags,

      duration: context?.duration,
      memoryUsage: context?.memoryUsage?.heapUsed,
      cpuUsage: context?.cpuUsage?.user,

      metadata: context?.metadata,
      custom: opts.customFields,
    }

    // Track processing time
    const processingTime = performance.now() - startTime
    this.processingTimes.push(processingTime)
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift()
    }

    return this.excludeFields(entry, opts.excludeFields)
  }

  /**
   * Serialize a structured log entry to JSON string
   *
   * @param {StructuredLogEntry} entry - The structured log entry to serialize.
   * @param {SerializationOptions} [options] - Optional serialization options.
   * @returns {string} JSON string representation of the log entry.
   */
  serialize(entry: StructuredLogEntry, options: SerializationOptions = {}): string {
    const startTime = performance.now()
    const opts = { ...this.defaultOptions, ...options }

    try {
      this.circularRefs.clear()

      // Apply field exclusion before serialization
      const filteredEntry = this.excludeFields(entry, opts.excludeFields)
      const serialized = this.serializeValue(filteredEntry, opts, 0)
      const result = opts.pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized)

      // Track metrics
      const serializationTime = performance.now() - startTime
      this.totalEntries++
      this.serializationTimes.push(serializationTime)
      this.processingTimes.push(serializationTime)

      // Keep only last 100 measurements for rolling average
      if (this.serializationTimes.length > 100) {
        this.serializationTimes.shift()
      }
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift()
      }

      return result
    } catch (error) {
      this.errorCount++
      return this.createFallbackEntry(entry, error as Error)
    }
  }

  /**
   * Create a minimal structured log entry for performance
   *
   * @param {LogLevelName} level - Log level name.
   * @param {string} message - Log message.
   * @param {TraceId} [traceId] - Optional trace ID.
   * @returns {string} Minimal JSON string representation of the log entry.
   */
  createMinimalEntry(
    level: LogLevelName,
    message: string,
    traceId?: TraceId,
  ): string {
    const timestamp = new Date().toISOString()
    const levelValue = LOG_LEVEL_VALUES[level]

    if (traceId) {
      return `{"timestamp":"${timestamp}","level":"${level}","levelValue":${levelValue},"message":"${message}","traceId":"${traceId}"}`
    }

    return `{"timestamp":"${timestamp}","level":"${level}","levelValue":${levelValue},"message":"${message}"}`
  }

  /**
   * Parse a JSON string into a structured log entry
   *
   * @param {string} json - JSON string to parse.
   * @returns {StructuredLogEntry} Parsed structured log entry.
   * @throws {SerializationError} If parsing fails.
   */
  parse(json: string): StructuredLogEntry {
    try {
      const parsed = JSON.parse(json)
      return this.validateLogEntry(parsed)
    } catch (error) {
      throw new SerializationError(
        `Failed to parse log entry: ${error instanceof Error ? error.message : String(error)}`,
        createErrorContext({ component: 'structured-logger' }),
        error as Error,
      )
    }
  }

  /**
   * Transform a structured log entry using a field mapping
   *
   * @param {StructuredLogEntry} entry - The structured log entry to transform.
   * @param {FieldMapping} mapping - Field mapping for transformation.
   * @returns {Record<string, unknown>} Transformed log entry.
   */
  transformFields(entry: StructuredLogEntry, mapping: FieldMapping): Record<string, unknown> {
    const transformed: Record<string, unknown> = {}

    // Map standard fields
    transformed[mapping.timestamp || 'timestamp'] = entry.timestamp
    transformed[mapping.level || 'level'] = entry.level
    transformed[mapping.message || 'message'] = entry.message

    if (entry.traceId) {
      transformed[mapping.traceId || 'traceId'] = entry.traceId
    }

    if (entry.spanId) {
      transformed[mapping.spanId || 'spanId'] = entry.spanId
    }

    if (entry.data) {
      transformed[mapping.data || 'data'] = entry.data
    }

    if (entry.error) {
      transformed[mapping.error || 'error'] = entry.error
    }

    if (entry.context) {
      transformed[mapping.context || 'context'] = entry.context
    }

    // Copy remaining fields
    for (const [key, value] of Object.entries(entry)) {
      if (!['timestamp', 'level', 'message', 'traceId', 'spanId', 'data', 'error', 'context'].includes(key)) {
        transformed[key] = value
      }
    }

    return transformed
  }

  /**
   * Serialize data with depth limit and circular reference detection
   *
   * @param {unknown} data - Data to serialize.
   * @param {SerializationOptions} options - Serialization options.
   * @returns {unknown} Serialized data.
   */
  private serializeData(data: unknown, options: SerializationOptions): unknown {
    return this.serializeValue(data, options, 0)
  }

  /**
   * Sanitize data by applying security redaction rules
   *
   * @param {unknown} data - Data to sanitize.
   * @param {SerializationOptions} options - Serialization options containing security rules.
   * @returns {unknown} Sanitized data.
   */
  private sanitizeData(data: unknown, options: SerializationOptions): unknown {
    this.circularRefs.clear()
    try {
      return this.serializeValue(data, options, 0)
    } catch (error) {
      // Handle circular references and other serialization errors gracefully
      if (error instanceof CircularReferenceError) {
        return '[CIRCULAR_REFERENCE_DETECTED]'
      }
      // For other errors, return a safe representation
      return '[SANITIZATION_ERROR]'
    }
  }

  /**
   * Serialize value with depth limit and circular reference detection
   *
   * @param {unknown} value - Value to serialize.
   * @param {SerializationOptions} options - Serialization options.
   * @param {number} depth - Current depth in the serialization tree.
   * @returns {unknown} Serialized value.
   */
  private serializeError(error: Error, options: SerializationOptions): StructuredError {
    const structuredError: StructuredError = {
      name: error.name,
      message: error.message,
    }

    if (options.includeStackTrace && error.stack) {
      structuredError.stack = error.stack
    }

    // Handle custom error properties
    if ('code' in error) {
      structuredError.code = String(error.code)
    }

    if ('cause' in error && error.cause instanceof Error) {
      structuredError.cause = this.serializeError(error.cause, options)
    }

    // Serialize other enumerable properties
    const details: Record<string, unknown> = {}
    for (const key of Object.getOwnPropertyNames(error)) {
      if (!['name', 'message', 'stack', 'code', 'cause'].includes(key)) {
        try {
          const value = (error as unknown as Record<string, unknown>)[key]
          if (value !== undefined) {
            details[key] = this.serializeValue(value, options, 1)
          }
        } catch {
          // Skip properties that can't be serialized
        }
      }
    }

    if (Object.keys(details).length > 0) {
      structuredError.details = details
    }

    return structuredError
  }

  /**
   * Serializes a value with depth limit and circular reference detection
   *
   * @param {unknown} value - Value to serialize.
   * @param {SerializationOptions} options - Serialization options.
   * @param {number} depth - Current depth in the serialization tree.
   * @param {string} [keyPath] - Current key path for sensitive data detection.
   * @returns {unknown} Serialized value.
   */
  private serializeValue(value: unknown, options: SerializationOptions, depth: number, keyPath = ''): unknown {
    if (depth > options.maxDepth!) {
      return '[MAX_DEPTH_EXCEEDED]'
    }

    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      // Check for sensitive data in strings
      const sanitized = this.sanitizeSensitiveData(value, keyPath, options)
      return sanitized.length > options.maxStringLength!
        ? sanitized.slice(0, options.maxStringLength!) + '...[TRUNCATED]'
        : sanitized
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (this.circularRefs.has(value as object)) {
      throw new CircularReferenceError(createErrorContext({ component: 'structured-logger' }))
    }

    if (typeof value === 'object') {
      this.circularRefs.add(value as object)

      try {
        if (Array.isArray(value)) {
          const maxLength = Math.min(value.length, options.maxArrayLength!)
          const serialized = value.slice(0, maxLength).map((item, index) =>
            this.serializeValue(item, options, depth + 1, `${keyPath}[${index}]`)
          )

          if (value.length > maxLength) {
            serialized.push(`...[${value.length - maxLength} more items]`)
          }

          return serialized
        }

        const serialized: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
          const currentPath = keyPath ? `${keyPath}.${key}` : key

          // Check if this key path should be redacted
          if (this.isSensitiveField(currentPath, options)) {
            serialized[key] = options.redactionPattern || '[REDACTED]'
          } else {
            serialized[key] = this.serializeValue(val, options, depth + 1, currentPath)
          }
        }

        return serialized
      } finally {
        this.circularRefs.delete(value as object)
      }
    }

    return String(value)
  }

  /**
   * Check if a field path contains sensitive data
   *
   * @param {string} keyPath - The current key path
   * @param {SerializationOptions} options - Serialization options
   * @returns {boolean} True if the field is sensitive
   */
  private isSensitiveField(keyPath: string, options: SerializationOptions): boolean {
    const sensitiveFields = options.sensitiveFields || this.defaultOptions.sensitiveFields
    const lowerPath = keyPath.toLowerCase()

    return sensitiveFields.some((field) =>
      lowerPath.includes(field.toLowerCase()) ||
      lowerPath.endsWith(field.toLowerCase())
    )
  }

  /**
   * Sanitize sensitive data from strings
   *
   * @param {string} value - The string value to sanitize
   * @param {string} keyPath - The current key path
   * @param {SerializationOptions} options - Serialization options
   * @returns {string} Sanitized string
   */
  private sanitizeSensitiveData(value: string, keyPath: string, options: SerializationOptions): string {
    // If the key path itself is sensitive, redact the entire value
    if (this.isSensitiveField(keyPath, options)) {
      return options.redactionPattern || '[REDACTED]'
    }

    // Apply common sensitive data patterns
    let sanitized = value

    // Credit card numbers (basic pattern)
    sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED-CC]')

    // Social Security Numbers
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]')

    // Bearer tokens
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')

    // API keys (basic pattern)
    sanitized = sanitized.replace(/[A-Za-z0-9]{20,}/g, (match) => {
      // Only redact if it looks like an API key (long alphanumeric string)
      if (match.length >= 32 && /^[A-Za-z0-9]+$/.test(match)) {
        return '[REDACTED-KEY]'
      }
      return match
    })

    return sanitized
  }

  /**
   * Create a timestamp in the specified format
   *
   * @param {SerializationOptions['timestampFormat']} format - Timestamp format. (e.g., 'iso', 'unix', 'epoch')
   * @returns {Timestamp} Formatted timestamp.
   */
  private createTimestamp(format: 'iso' | 'unix' | 'epoch'): Timestamp {
    const now = new Date()

    switch (format) {
      case 'unix':
        return Math.floor(now.getTime() / 1000).toString() as Timestamp
      case 'epoch':
        return now.getTime().toString() as Timestamp
      case 'iso':
      default:
        return now.toISOString() as Timestamp
    }
  }

  /**
   * Extract labels from Stoat context for observability
   *
   * @param {StoatContext} context - The Stoat context to extract labels from.
   * @returns {Record<string, string> | undefined} Extracted labels or undefined if none.
   */
  private extractLabels(context?: StoatContext): Record<string, string> | undefined {
    if (!context) return undefined

    const labels: Record<string, string> = {}

    // Extract meaningful labels for observability
    if (context.environment) labels.environment = context.environment
    if (context.component) labels.component = context.component
    if (context.module) labels.module = context.module
    if (context.symbol) labels.symbol = context.symbol
    if (context.strategy) labels.strategy = context.strategy

    return Object.keys(labels).length > 0 ? labels : undefined
  }

  /**
   * Exclude specified fields from the structured log entry
   *
   * @param {StructuredLogEntry} entry - The structured log entry to filter.
   * @param {string[]} excludeFields - Fields to exclude from the entry.
   * @returns {StructuredLogEntry} Filtered log entry without excluded fields.
   */
  private excludeFields(entry: StructuredLogEntry, excludeFields: string[]): StructuredLogEntry {
    if (excludeFields.length === 0) return entry

    const filtered = { ...entry }
    for (const field of excludeFields) {
      delete (filtered as Record<string, unknown>)[field]
    }

    return filtered
  }

  /**
   * Validate a structured log entry object
   *
   * @param {unknown} obj - The object to validate.
   * @returns {StructuredLogEntry} Validated structured log entry.
   * @throws {Error} If the object is not a valid structured log entry.
   */
  private validateLogEntry(obj: unknown): StructuredLogEntry {
    if (!obj || typeof obj !== 'object') {
      throw new Error('Log entry must be an object')
    }

    const entry = obj as Record<string, unknown>

    if (!entry.timestamp || !entry.level || !entry.message) {
      throw new Error('Log entry must have timestamp, level, and message fields')
    }

    return entry as unknown as StructuredLogEntry
  }

  /**
   * Create a fallback entry in case serialization fails
   *
   * @param {StructuredLogEntry} entry - The original log entry.
   * @param {Error} error - The error that occurred during serialization.
   * @returns {string} Fallback JSON string representation of the log entry.
   */
  private createFallbackEntry(entry: StructuredLogEntry, error: Error): string {
    const fallback = {
      timestamp: new Date().toISOString(),
      level: entry.level,
      message: entry.message,
      error: `Serialization failed: ${error.message}`,
      traceId: entry.traceId,
    }

    return JSON.stringify(fallback)
  }

  /**
   * Update serialization options
   *
   * @param {Partial<SerializationOptions>} options - New options to update.
   */
  updateOptions(options: Partial<SerializationOptions>): void {
    Object.assign(this.defaultOptions, options)
  }

  /**
   * Get current serialization options
   *
   * @returns {SerializationOptions} Current serialization options.
   */
  getOptions(): SerializationOptions {
    return { ...this.defaultOptions }
  }

  /**
   * Get metrics for the structured logger
   *
   * @returns {Object} Metrics object containing total entries and error count.
   */
  getMetrics(): { totalEntries: number; errorCount: number } {
    return {
      totalEntries: this.totalEntries,
      errorCount: this.errorCount,
    }
  }

  /**
   * Get performance statistics for the structured logger
   *
   * @returns {Object} Performance stats object.
   */
  getPerformanceStats(): { totalEntries: number; averageSerializationTime: number; averageProcessingTime: number } {
    const avgSerializationTime = this.serializationTimes.length > 0
      ? this.serializationTimes.reduce((sum, time) => sum + time, 0) / this.serializationTimes.length
      : 0

    const avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      : 0

    return {
      totalEntries: this.totalEntries,
      averageSerializationTime: avgSerializationTime,
      averageProcessingTime: avgProcessingTime,
    }
  }
}

/**
 * Factory function to create a structured log entry
 *
 * @param {LogLevelName} level - Log level name.
 * @param {string} message - Log message.
 * @param {unknown} [data] - Optional structured data.
 * @param {StoatContext} [context] - Optional Stoat context for observability.
 * @returns {StructuredLogEntry} The structured log entry.
 */
export function createStructuredEntry(
  level: LogLevelName,
  message: string,
  data?: unknown,
  context?: StoatContext,
): StructuredLogEntry {
  const logger = new StructuredLogger()
  return logger.createLogEntry({ level, message, data, context })
}

/**
 * Serialize a structured log entry to JSON string
 *
 * @param {StructuredLogEntry} entry - The structured log entry to serialize.
 * @param {SerializationOptions} [options] - Optional serialization options.
 * @returns {string} JSON string representation of the log entry.
 */
export function serializeLogEntry(
  entry: StructuredLogEntry,
  options?: SerializationOptions,
): string {
  const logger = new StructuredLogger(options)
  return logger.serialize(entry, options)
}

/**
 * Parse a JSON string into a structured log entry
 *
 * @param {string} json - JSON string to parse.
 * @returns {StructuredLogEntry} Parsed structured log entry.
 * @throws {SerializationError} If parsing fails.
 */
export function createStructuredLogger(options?: SerializationOptions): StructuredLogger {
  return new StructuredLogger(options)
}
