/**
 * Hybrid logger implementation - combines async + structured capabilities
 * @module
 */

import type { LogLevelName } from '../types/logLevels.ts'
import { LOG_LEVEL_VALUES } from '../types/logLevels.ts'
import type { StoatContext } from '../stoat/context.ts'
import type { TraceId, Timestamp, LogMessage } from '../types/brands.ts'
import { StoatAsyncLogger, type AsyncConfig, type AsyncMetrics } from './async-logger.ts'
import { 
  StoatStructuredLogger, 
  type StructuredConfig 
} from './structured-logger.ts'
import { 
  type StructuredLogEntry,
  type SerializationOptions,
  type FieldMapping
} from './structured-log-entry.ts'

/**
 * Configuration for StoatHybridLogger
 */
export interface HybridConfig {
  /** Async logger configuration */
  async: AsyncConfig
  /** Structured logger configuration */
  structured?: StructuredConfig
  /** Whether to enable structured logging features */
  enableStructuredLogging?: boolean
  /** Whether to pass structured entries through async buffer */
  asyncStructuredLogging?: boolean
}

/**
 * StoatHybridLogger - Combines async + structured logging capabilities
 * 
 * This logger handles complex configurations that need both async buffering
 * and structured logging features. It provides the full feature set of both
 * async and structured logging in a unified interface.
 */
export class StoatHybridLogger {
  private asyncLogger: StoatAsyncLogger
  private structuredLogger: StoatStructuredLogger
  private enableStructuredLogging: boolean
  private asyncStructuredLogging: boolean

  /**
   * Create a new StoatHybridLogger instance
   * @param config Hybrid logger configuration
   */
  constructor(config: HybridConfig) {
    this.enableStructuredLogging = config.enableStructuredLogging ?? true
    this.asyncStructuredLogging = config.asyncStructuredLogging ?? true

    // Create async logger - this will handle the actual output
    this.asyncLogger = new StoatAsyncLogger(
      config.async,
      this.enableStructuredLogging && !this.asyncStructuredLogging 
        ? (entry) => this.handleSyncStructuredEntry(entry)
        : undefined
    )

    // Create structured logger - this will handle entry creation and serialization
    this.structuredLogger = new StoatStructuredLogger({
      outputConsole: false, // Async logger handles output
      onEntry: this.asyncStructuredLogging ? (serialized) => this.handleAsyncStructuredEntry(serialized) : undefined,
      ...config.structured,
    })
  }

  /**
   * Log a trace level message
   * @param message Log message
   * @param data Optional additional data
   * @param context Optional Stoat context for observability
   * @returns Promise that resolves when logged
   */
  async trace(message: string, data?: unknown, context?: StoatContext): Promise<void> {
    const entry = this.createEntry('trace', message, data, undefined, context)
    await this.asyncLogger.log(entry)
  }

  /**
   * Log a debug level message
   * @param message Log message
   * @param data Optional additional data
   * @param context Optional Stoat context for observability
   * @returns Promise that resolves when logged
   */
  async debug(message: string, data?: unknown, context?: StoatContext): Promise<void> {
    const entry = this.createEntry('debug', message, data, undefined, context)
    await this.asyncLogger.log(entry)
  }

  /**
   * Log an info level message
   * @param message Log message
   * @param data Optional additional data
   * @param context Optional Stoat context for observability
   * @returns Promise that resolves when logged
   */
  async info(message: string, data?: unknown, context?: StoatContext): Promise<void> {
    const entry = this.createEntry('info', message, data, undefined, context)
    await this.asyncLogger.log(entry)
  }

  /**
   * Log a warning level message
   * @param message Log message
   * @param data Optional additional data
   * @param context Optional Stoat context for observability
   * @returns Promise that resolves when logged
   */
  async warn(message: string, data?: unknown, context?: StoatContext): Promise<void> {
    const entry = this.createEntry('warn', message, data, undefined, context)
    await this.asyncLogger.log(entry)
  }

  /**
   * Log an error level message
   * @param message Log message
   * @param error Optional error object
   * @param data Optional additional data
   * @param context Optional Stoat context for observability
   * @returns Promise that resolves when logged
   */
  async error(message: string, error?: Error, data?: unknown, context?: StoatContext): Promise<void> {
    const entry = this.createEntry('error', message, data, error, context)
    await this.asyncLogger.log(entry)
  }

  /**
   * Log a fatal level message
   * @param message Log message
   * @param error Optional error object
   * @param data Optional additional data
   * @param context Optional Stoat context for observability
   * @returns Promise that resolves when logged
   */
  async fatal(message: string, error?: Error, data?: unknown, context?: StoatContext): Promise<void> {
    const entry = this.createEntry('fatal', message, data, error, context)
    await this.asyncLogger.log(entry)
  }

  /**
   * Log a pre-created structured log entry
   * @param entry The structured log entry to log
   * @returns Promise that resolves when logged
   */
  async log(entry: StructuredLogEntry): Promise<void> {
    await this.asyncLogger.log(entry)
  }

  /**
   * Synchronously log an entry (bypasses async buffer)
   * @param entry The structured log entry to log
   */
  logSync(entry: StructuredLogEntry): void {
    this.asyncLogger.logSync(entry)
  }

  /**
   * Create a structured log entry without logging it
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
    return this.structuredLogger.createLogEntry({ level, message, data, error, context, options })
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
    return this.structuredLogger.createMinimalEntry(level, message, traceId)
  }

  /**
   * Serialize a structured log entry to JSON string
   * @param entry The structured log entry to serialize
   * @param options Optional serialization options
   * @returns JSON string representation of the log entry
   */
  serialize(entry: StructuredLogEntry, options?: SerializationOptions): string {
    return this.structuredLogger.serialize(entry, options)
  }

  /**
   * Parse a JSON string into a structured log entry
   * @param json JSON string to parse
   * @returns Parsed structured log entry
   */
  parse(json: string): StructuredLogEntry {
    return this.structuredLogger.parse(json)
  }

  /**
   * Transform a structured log entry using a field mapping
   * @param entry The structured log entry to transform
   * @param mapping Field mapping for transformation
   * @returns Transformed log entry
   */
  transformFields(entry: StructuredLogEntry, mapping: FieldMapping): Record<string, unknown> {
    return this.structuredLogger.transformFields(entry, mapping)
  }

  /**
   * Force flush all buffered entries
   * @returns Promise that resolves when all entries are flushed
   */
  async flush(): Promise<void> {
    await this.asyncLogger.flush()
  }

  /**
   * Enable sync mode for the async logger
   */
  enableSyncMode(): void {
    this.asyncLogger.enableSyncMode()
  }

  /**
   * Disable sync mode for the async logger
   */
  disableSyncMode(): void {
    this.asyncLogger.disableSyncMode()
  }

  /**
   * Check if currently in sync mode
   * @returns True if in sync mode, false otherwise
   */
  isSyncMode(): boolean {
    return this.asyncLogger.isSyncMode()
  }

  /**
   * Update async logger configuration
   * @param config Partial configuration to update
   */
  updateAsyncConfig(config: Partial<AsyncConfig>): void {
    this.asyncLogger.updateConfig(config)
  }

  /**
   * Update structured logger serialization options
   * @param options New options to update
   */
  updateStructuredOptions(options: Partial<SerializationOptions>): void {
    this.structuredLogger.updateOptions(options)
  }

  /**
   * Get async logger metrics
   * @returns Current async metrics
   */
  getAsyncMetrics(): AsyncMetrics {
    return this.asyncLogger.getMetrics()
  }

  /**
   * Get structured logger metrics
   * @returns Structured logger metrics object
   */
  getStructuredMetrics(): { totalEntries: number; errorCount: number } {
    return this.structuredLogger.getMetrics()
  }

  /**
   * Get structured logger performance statistics
   * @returns Performance stats object
   */
  getStructuredPerformanceStats(): { totalEntries: number; averageSerializationTime: number; averageProcessingTime: number } {
    return this.structuredLogger.getPerformanceStats()
  }

  /**
   * Get combined metrics from both async and structured loggers
   * @returns Combined metrics object
   */
  getCombinedMetrics(): {
    async: AsyncMetrics
    structured: { totalEntries: number; errorCount: number }
    performance: { totalEntries: number; averageSerializationTime: number; averageProcessingTime: number }
  } {
    return {
      async: this.getAsyncMetrics(),
      structured: this.getStructuredMetrics(),
      performance: this.getStructuredPerformanceStats(),
    }
  }

  /**
   * Destroy the hybrid logger and clean up resources
   * @returns Promise that resolves when cleanup is complete
   */
  async destroy(): Promise<void> {
    await this.asyncLogger.destroy()
    this.structuredLogger.close()
  }

  /**
   * Create a structured log entry and handle it appropriately
   * @param level Log level
   * @param message Log message
   * @param data Optional data
   * @param error Optional error
   * @param context Optional context
   * @returns The created structured log entry
   */
  private createEntry(
    level: LogLevelName,
    message: string,
    data?: unknown,
    error?: Error,
    context?: StoatContext
  ): StructuredLogEntry {
    if (this.enableStructuredLogging) {
      return this.structuredLogger.createLogEntry({ level, message, data, error, context })
    } else {
      // Create a minimal entry for async logging
      const timestamp = new Date().toISOString() as Timestamp
      return {
        timestamp,
        level,
        levelValue: LOG_LEVEL_VALUES[level],
        message: message as LogMessage,
        data,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
        context,
      }
    }
  }

  /**
   * Handle structured entries when using async structured logging
   * @param serializedEntry Serialized log entry
   */
  private async handleAsyncStructuredEntry(serializedEntry: string): Promise<void> {
    // Parse the serialized entry and send it through async logger
    try {
      const entry = this.structuredLogger.parse(serializedEntry)
      await this.asyncLogger.log(entry)
    } catch {
      // If parsing fails, create a minimal entry
      const timestamp = new Date().toISOString() as Timestamp
      const minimalEntry: StructuredLogEntry = {
        timestamp,
        level: 'error',
        levelValue: 50,
        message: 'Failed to parse structured log entry' as LogMessage,
        data: { originalEntry: serializedEntry },
      }
      await this.asyncLogger.log(minimalEntry)
    }
  }

  /**
   * Handle structured entries when using sync structured logging
   * @param entry Structured log entry
   */
  private handleSyncStructuredEntry(entry: StructuredLogEntry): void {
    if (this.enableStructuredLogging) {
      // Serialize and output directly
      const serialized = this.structuredLogger.serialize(entry)
      console.log(serialized)
    } else {
      // Basic output
      console.log(JSON.stringify(entry))
    }
  }
}