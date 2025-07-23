/**
 * Structured logger implementation - encapsulates structured logging functionality
 * @module
 */

import type { LogLevelName } from '../types/logLevels.ts'
import type { StoatContext } from '../stoat/context.ts'
import type { TraceId } from '../types/brands.ts'
import {
  type FieldMapping,
  type SerializationOptions,
  type StructuredLogEntry,
  StructuredLogger,
} from './structured-log-entry.ts'

/**
 * Configuration for StoatStructuredLogger
 */
export interface StructuredConfig extends SerializationOptions {
  /** Optional callback for handling serialized entries */
  onEntry?: (serializedEntry: string) => void
  /** Whether to automatically output to console */
  outputConsole?: boolean
}

/**
 * StoatStructuredLogger - Structured logging functionality
 *
 * Encapsulates structured logging functionality into a cohesive class that provides
 * methods for creating and handling structured log entries with comprehensive
 * serialization and customization options.
 */
export class StoatStructuredLogger {
  private logger: StructuredLogger
  private onEntry?: (serializedEntry: string) => void
  private outputConsole: boolean

  /**
   * Create a new StoatStructuredLogger instance
   * @param config Logger configuration including serialization options
   */
  constructor(config: StructuredConfig = {}) {
    const { onEntry, outputConsole = false, ...serializationOptions } = config
    this.logger = new StructuredLogger(serializationOptions)
    this.onEntry = onEntry
    this.outputConsole = outputConsole
  }

  /**
   * Create and log a structured entry with trace level
   * @param message Log message
   * @param data Optional structured data
   * @param context Optional Stoat context for observability
   * @returns The created structured log entry
   */
  trace(message: string, data?: unknown, context?: StoatContext): StructuredLogEntry {
    return this.createAndProcess('trace', message, data, undefined, context)
  }

  /**
   * Create and log a structured entry with debug level
   * @param message Log message
   * @param data Optional structured data
   * @param context Optional Stoat context for observability
   * @returns The created structured log entry
   */
  debug(message: string, data?: unknown, context?: StoatContext): StructuredLogEntry {
    return this.createAndProcess('debug', message, data, undefined, context)
  }

  /**
   * Create and log a structured entry with info level
   * @param message Log message
   * @param data Optional structured data
   * @param context Optional Stoat context for observability
   * @returns The created structured log entry
   */
  info(message: string, data?: unknown, context?: StoatContext): StructuredLogEntry {
    return this.createAndProcess('info', message, data, undefined, context)
  }

  /**
   * Create and log a structured entry with warn level
   * @param message Log message
   * @param data Optional structured data
   * @param context Optional Stoat context for observability
   * @returns The created structured log entry
   */
  warn(message: string, data?: unknown, context?: StoatContext): StructuredLogEntry {
    return this.createAndProcess('warn', message, data, undefined, context)
  }

  /**
   * Create and log a structured entry with error level
   * @param message Log message
   * @param error Optional error object
   * @param data Optional structured data
   * @param context Optional Stoat context for observability
   * @returns The created structured log entry
   */
  error(message: string, error?: Error, data?: unknown, context?: StoatContext): StructuredLogEntry {
    return this.createAndProcess('error', message, data, error, context)
  }

  /**
   * Create and log a structured entry with fatal level
   * @param message Log message
   * @param error Optional error object
   * @param data Optional structured data
   * @param context Optional Stoat context for observability
   * @returns The created structured log entry
   */
  fatal(message: string, error?: Error, data?: unknown, context?: StoatContext): StructuredLogEntry {
    return this.createAndProcess('fatal', message, data, error, context)
  }

  /**
   * Create a structured log entry without processing it
   * @param level Log level name
   * @param message Log message
   * @param data Optional structured data
   * @param error Optional error object
   * @param context Optional Stoat context for observability
   * @param options Optional serialization overrides
   * @returns The created structured log entry
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
    return this.logger.createLogEntry({ level, message, data, error, context, options })
  }

  /**
   * Serialize a structured log entry to JSON string
   * @param entry The structured log entry to serialize
   * @param options Optional serialization options
   * @returns JSON string representation of the log entry
   */
  serialize(entry: StructuredLogEntry, options?: SerializationOptions): string {
    return this.logger.serialize(entry, options)
  }

  /**
   * Create a minimal structured log entry for performance
   * @param level Log level name
   * @param message Log message
   * @param traceId Optional trace ID
   * @returns Minimal JSON string representation of the log entry
   */
  createMinimalEntry(
    level: LogLevelName,
    message: string,
    traceId?: TraceId,
  ): string {
    return this.logger.createMinimalEntry(level, message, traceId)
  }

  /**
   * Parse a JSON string into a structured log entry
   * @param json JSON string to parse
   * @returns Parsed structured log entry
   */
  parse(json: string): StructuredLogEntry {
    return this.logger.parse(json)
  }

  /**
   * Transform a structured log entry using a field mapping
   * @param entry The structured log entry to transform
   * @param mapping Field mapping for transformation
   * @returns Transformed log entry
   */
  transformFields(entry: StructuredLogEntry, mapping: FieldMapping): Record<string, unknown> {
    return this.logger.transformFields(entry, mapping)
  }

  /**
   * Update serialization options
   * @param options New options to update
   */
  updateOptions(options: Partial<SerializationOptions>): void {
    this.logger.updateOptions(options)
  }

  /**
   * Get current serialization options
   * @returns Current serialization options
   */
  getOptions(): SerializationOptions {
    return this.logger.getOptions()
  }

  /**
   * Get metrics for the structured logger
   * @returns Metrics object containing total entries and error count
   */
  getMetrics(): { totalEntries: number; errorCount: number } {
    return this.logger.getMetrics()
  }

  /**
   * Get performance statistics for the structured logger
   * @returns Performance stats object
   */
  getPerformanceStats(): { totalEntries: number; averageSerializationTime: number; averageProcessingTime: number } {
    return this.logger.getPerformanceStats()
  }

  /**
   * Update the entry callback function
   * @param callback New callback function for handling entries
   */
  setEntryCallback(callback?: (serializedEntry: string) => void): void {
    this.onEntry = callback
  }

  /**
   * Enable or disable console output
   * @param enabled Whether to output to console
   */
  setConsoleOutput(enabled: boolean): void {
    this.outputConsole = enabled
  }

  /**
   * No-op flush method for API compatibility
   */
  flush(): void {
    // No-op - structured logger processes entries immediately
  }

  /**
   * No-op close method for API compatibility
   */
  close(): void {
    // No-op - no resources to cleanup
  }

  /**
   * Create and process a structured log entry
   * @param level Log level
   * @param message Log message
   * @param data Optional data
   * @param error Optional error
   * @param context Optional context
   * @returns The created structured log entry
   */
  private createAndProcess(
    level: LogLevelName,
    message: string,
    data?: unknown,
    error?: Error,
    context?: StoatContext,
  ): StructuredLogEntry {
    const entry = this.logger.createLogEntry({ level, message, data, error, context })

    // Serialize the entry
    const serialized = this.logger.serialize(entry)

    // Process the serialized entry
    if (this.onEntry) {
      this.onEntry(serialized)
    }

    // Output to console if enabled
    if (this.outputConsole) {
      // Use appropriate console method based on level
      switch (level) {
        case 'trace':
        case 'debug':
          console.debug(serialized)
          break
        case 'info':
          console.info(serialized)
          break
        case 'warn':
          console.warn(serialized)
          break
        case 'error':
        case 'fatal':
          console.error(serialized)
          break
        default:
          console.log(serialized)
      }
    }

    return entry
  }
}
