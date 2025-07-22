/**
 * Base transport interface and abstract implementation
 * @module
 */

import type { Timestamp } from '../types/brands.ts'
import type { LogLevelName } from '../types/logLevels.ts'
import type { StoatContext } from '../stoat/context.ts'
import type { StructuredLogEntry } from '../loggers/structured-log-entry.ts'

/**
 * Transport destination type
 *
 * @property {string} console - Write to console output
 * @property {string} file - Write to a file
 * @property {string} stream - Write to a writable stream
 * @property {string} http - Send logs over HTTP
 * @property {string} websocket - Send logs over WebSocket
 * @property {string} memory - Store logs in memory
 * @property {string} custom - Custom transport implementation
 */
export type TransportDestination =
  | 'console'
  | 'file'
  | 'stream'
  | 'http'
  | 'websocket'
  | 'memory'
  | 'custom'

/**
 * Transport configuration base
 *
 * @property {TransportDestination} destination - The destination type for the transport
 * @property {string} [name] - Optional name for the transport
 * @property {boolean} enabled - Whether the transport is enabled
 * @property {LogLevelName} minLevel - Minimum log level to write
 * @property {LogLevelName} [maxLevel] - Optional maximum log level to write
 * @property {'json' | 'text' | 'custom'} [format] - Format of log entries
 * @property {boolean} async - Whether to write logs asynchronously
 * @property {number} [bufferSize] - Size of the buffer for async transports
 * @property {number} [flushInterval] - Interval for flushing buffered logs (in ms)
 * @property {(error: Error, entry: StructuredLogEntry) => void} [errorHandler] - Optional error handler for transport errors
 */
export interface BaseTransportConfig {
  readonly destination: TransportDestination
  readonly name?: string
  readonly enabled: boolean
  readonly minLevel: LogLevelName
  readonly maxLevel?: LogLevelName
  readonly format?: 'json' | 'text' | 'custom'
  readonly async: boolean
  readonly bufferSize?: number
  readonly flushInterval?: number
  readonly errorHandler?: (error: Error, entry: StructuredLogEntry) => void
}

/**
 * Transport statistics for monitoring
 *
 * @property {number} messagesWritten - Total messages successfully written
 * @property {number} messagesDropped - Total messages dropped due to buffer overflow or level filtering
 * @property {number} bytesWritten - Total bytes written to the transport
 * @property {number} errors - Total errors encountered during write operations
 * @property {Timestamp} lastWrite - Timestamp of the last successful write operation
 * @property {number} avgWriteTime - Average time taken for write operations (in ms
 * @property {number} [bufferUsage] - Current buffer usage (if applicable)
 */
export interface TransportStats {
  messagesWritten: number
  messagesDropped: number
  bytesWritten: number
  errors: number
  lastWrite: Timestamp
  avgWriteTime: number
  bufferUsage?: number
}

/**
 * Transport write result
 *
 * @property {boolean} success - Whether the write operation was successful
 * @property {number} [bytesWritten] - Number of bytes written (if applicable)
 * @property {number} [duration] - Duration of the write operation (in ms)
 * @property {Error} [error] - Error encountered during the write operation (if any
 */
export interface WriteResult {
  readonly success: boolean
  readonly bytesWritten?: number
  readonly duration?: number
  readonly error?: Error
}

/**
 * Transport interface that all transports must implement
 *
 * @property {BaseTransportConfig} config - Configuration for the transport
 * @property {TransportDestination} destination - The destination type for the transport
 * @property {TransportStats} stats - Current statistics for the transport
 */
export interface Transport {
  readonly config: BaseTransportConfig
  readonly destination: TransportDestination
  readonly stats: TransportStats

  /**
   * Write a log entry to the transport
   *
   * @param {StructuredLogEntry} entry - The structured log entry to write
   * @param {StoatContext} [context] - Optional context for the entry
   * @returns {Promise<WriteResult>} - Result of the write operation
   */
  write(entry: StructuredLogEntry, context?: StoatContext): Promise<WriteResult>

  /**
   * Write multiple entries efficiently
   *
   * @param {StructuredLogEntry[]} entries - Array of structured log entries to write
   * @param {StoatContext} [context] - Optional context for the entries
   * @returns {Promise<WriteResult[]>} - Results of the write operations
   */
  writeBatch(entries: StructuredLogEntry[], context?: StoatContext): Promise<WriteResult[]>

  /**
   * Flush any buffered entries
   */
  flush(): Promise<void>

  /**
   * Close the transport and clean up resources
   */
  close(): Promise<void>

  /**
   * Check if the transport can write at the given level
   *
   * @param {string} level - The log level to check
   * @returns {boolean} - True if the transport can write at this level, false
   */
  canWrite(level: string): boolean

  /**
   * Get current transport health status
   */
  isHealthy(): boolean
}

/**
 * Abstract base transport implementation
 *
 * Provides common functionality for all transports
 * such as buffering, flushing, and statistics tracking.
 * Subclasses must implement the actual writing logic.
 *
 * @abstract
 * @class BaseTransport
 * @param {BaseTransportConfig} config - Configuration for the transport
 * @throws {TransportConfigError} - If configuration is invalid
 * @throws {TransportError} - For general transport errors
 * @throws {Error} - For unexpected errors
 */
export abstract class BaseTransport implements Transport {
  protected _stats: TransportStats
  protected _closed = false
  protected _buffer: StructuredLogEntry[] = []
  protected _flushTimer?: number

  constructor(public readonly config: BaseTransportConfig) {
    this._stats = {
      messagesWritten: 0,
      messagesDropped: 0,
      bytesWritten: 0,
      errors: 0,
      lastWrite: new Date().toISOString() as Timestamp,
      avgWriteTime: 0,
      bufferUsage: 0,
    }

    // Setup auto-flush if configured
    if (config.async && config.flushInterval) {
      this._flushTimer = setInterval(() => {
        this.flush().catch((error) => {
          config.errorHandler?.(error, {} as StructuredLogEntry)
        })
      }, config.flushInterval)
    }
  }

  get destination(): TransportDestination {
    return this.config.destination
  }

  get stats(): TransportStats {
    return {
      ...this._stats,
      bufferUsage: this._buffer.length,
    }
  }

  /**
   * Check if transport can write at given level
   *
   * @param {LogLevelName} level - The log level to check
   * @returns {boolean} - True if transport can write at this level, false otherwise
   */
  canWrite(level: LogLevelName): boolean {
    if (this._closed || !this.config.enabled) {
      return false
    }

    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    const minIndex = levels.indexOf(this.config.minLevel)
    const levelIndex = levels.indexOf(level)

    if (levelIndex < minIndex) {
      return false
    }

    if (this.config.maxLevel) {
      const maxIndex = levels.indexOf(this.config.maxLevel)
      if (levelIndex > maxIndex) {
        return false
      }
    }

    return true
  }

  /**
   * Write a single log entry
   *
   * @param {StructuredLogEntry} entry - The structured log entry to write
   * @param {StoatContext} [context] - Optional context for the entry
   * @returns {Promise<WriteResult>} - Result of the write operation
   * @throws {Error} - For unexpected errors
   */
  async write(entry: StructuredLogEntry, context?: StoatContext): Promise<WriteResult> {
    if (!this.canWrite(entry.level)) {
      this._stats.messagesDropped++
      return { success: false }
    }

    const startTime = performance.now()

    try {
      if (this.config.async && this.config.bufferSize && this.config.bufferSize > 1) {
        return this._writeBuffered(entry, context)
      } else {
        return await this._writeImmediate(entry, context)
      }
    } catch (error) {
      this._stats.errors++
      this.config.errorHandler?.(error as Error, entry)
      return {
        success: false,
        error: error as Error,
        duration: performance.now() - startTime,
      }
    }
  }

  /**
   * Write multiple entries in batch
   *
   * @param {StructuredLogEntry[]} entries - Array of structured log entries to write
   * @param {StoatContext} [context] - Optional context for the entries
   * @returns {Promise<WriteResult[]>} - Results of the write operations
   * @throws {Error} - For unexpected errors
   */
  async writeBatch(entries: StructuredLogEntry[], context?: StoatContext): Promise<WriteResult[]> {
    const results: WriteResult[] = []

    for (const entry of entries) {
      results.push(await this.write(entry, context))
    }

    return results
  }

  /**
   * Flush buffered entries
   */
  async flush(): Promise<void> {
    if (this._buffer.length === 0) {
      return
    }

    const entries = [...this._buffer]
    this._buffer = []

    try {
      await this._flushEntries(entries)
    } catch (error) {
      // Re-add entries to buffer on failure
      this._buffer.unshift(...entries)
      throw error
    }
  }

  /**
   * Close transport and cleanup
   */
  async close(): Promise<void> {
    if (this._closed) {
      return
    }

    this._closed = true

    if (this._flushTimer) {
      clearInterval(this._flushTimer)
    }

    // Flush remaining entries
    await this.flush()

    await this._cleanup()
  }

  /**
   * Check transport health
   */
  isHealthy(): boolean {
    return !this._closed && this.config.enabled
  }

  /**
   * Write entry immediately (synchronous path)
   *
   * @param {StructuredLogEntry} entry - The structured log entry to write
   * @param {StoatContext} [context] - Optional context for the entry
   * @returns {Promise<WriteResult>} - Result of the write operation
   * @protected
   */
  protected async _writeImmediate(entry: StructuredLogEntry, context?: StoatContext): Promise<WriteResult> {
    const startTime = performance.now()
    const formatted = this._formatEntry(entry, context)

    const result = await this._doWrite(formatted)

    if (result.success) {
      this._updateStats(result, performance.now() - startTime)
    }

    return {
      ...result,
      duration: performance.now() - startTime,
    }
  }

  /**
   * Write entry to buffer (async path)
   *
   * @param {StructuredLogEntry} entry - The structured log entry to write
   * @param {StoatContext} [context] - Optional context for the entry
   * @returns {WriteResult} - Result of the write operation
   * @protected
   */
  protected _writeBuffered(entry: StructuredLogEntry, _context?: StoatContext): WriteResult {
    if (this._buffer.length >= (this.config.bufferSize || 100)) {
      // Buffer full, drop oldest or flush immediately
      this._buffer.shift()
      this._stats.messagesDropped++
    }

    this._buffer.push(entry)
    return { success: true }
  }

  /**
   * Flush buffered entries to destination
   * @param {StructuredLogEntry[]} entries - Array of structured log entries to flush
   * @returns {Promise<void>} - Resolves when flush is complete
   * @protected
   */
  protected async _flushEntries(entries: StructuredLogEntry[]): Promise<void> {
    for (const entry of entries) {
      const formatted = this._formatEntry(entry)
      const result = await this._doWrite(formatted)

      if (result.success) {
        this._updateStats(result, 0)
      } else {
        this._stats.errors++
      }
    }
  }

  /**
   * Format entry for output
   *
   * @param {StructuredLogEntry} entry - The structured log entry to format
   * @param {StoatContext} [context] - Optional context for the entry
   * @returns {string} - Formatted entry string
   * @protected
   */
  protected _formatEntry(entry: StructuredLogEntry, context?: StoatContext): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(entry) + '\n'
      case 'text':
        return this._formatAsText(entry) + '\n'
      case 'custom':
        return this._customFormat(entry, context) + '\n'
      default:
        return JSON.stringify(entry) + '\n'
    }
  }

  /**
   * Format entry as human-readable text
   *
   * @param {StructuredLogEntry} entry - The structured log entry to format
   * @returns {string} - Formatted text string
   * @protected
   */
  protected _formatAsText(entry: StructuredLogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const message = entry.message || ''

    let formatted = `${timestamp} ${level} ${message}`

    // Add additional fields
    const extraFields = Object.entries(entry)
      .filter(([key]) => !['timestamp', 'level', 'message'].includes(key))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ')

    if (extraFields) {
      formatted += ` ${extraFields}`
    }

    return formatted
  }

  /**
   * Custom formatting hook for subclasses
   *
   * @param {StructuredLogEntry} entry - The structured log entry to format
   * @param {StoatContext} [_context] - Optional context for the entry
   * @returns {string} - Custom formatted entry string
   * @protected
   */
  protected _customFormat(entry: StructuredLogEntry, _context?: StoatContext): string {
    return JSON.stringify(entry)
  }

  /**
   * Update transport statistics
   *
   * @param {WriteResult} result - Result of the write operation
   * @param {number} duration - Duration of the write operation in milliseconds
   * @protected
   */
  protected _updateStats(result: WriteResult, duration: number): void {
    this._stats.messagesWritten++
    this._stats.bytesWritten += result.bytesWritten || 0
    this._stats.lastWrite = new Date().toISOString() as Timestamp

    // Update average write time using exponential moving average
    this._stats.avgWriteTime = this._stats.avgWriteTime * 0.9 + duration * 0.1
  }

  /**
   * Abstract method for actual writing - must be implemented by subclasses
   *
   * @param {string} formatted - The formatted log entry string to write
   * @returns {Promise<WriteResult>} - Result of the write operation
   * @protected
   */
  protected abstract _doWrite(formatted: string): Promise<WriteResult>

  /**
   * Abstract cleanup method for subclasses
   *
   * @protected
   */
  protected abstract _cleanup(): Promise<void>
}

/**
 * Transport Error Class
 *
 * Base class for transport-related errors.Includes transport name and optional cause.
 * Used to differentiate transport errors from other application errors.
 *
 * @extends {Error}
 * @param {string} message - Error message
 * @param {string} transport - Name of the transport where the error occurred
 * @param {Error} [cause] - Optional cause of the error
 * @throws {TransportError} - For transport-specific errors
 * @throws {TransportConfigError} - For configuration-related errors
 * @throws {TransportWriteError} - For write operation errors
 * @throws {Error} - For unexpected errors
 * @class
 */
export class TransportError extends Error {
  constructor(
    message: string,
    public readonly transport: string,
    public override readonly cause?: Error,
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

/**
 * Transport Configuration Error Class
 *
 * Used when transport configuration is invalid or missing required fields.
 * Provides specific error handling for transport configuration issues.
 *
 * @extends {TransportError}
 * @param {string} transport - Name of the transport where the error occurred
 * @param {string} configIssue - Description of the configuration issue
 * @param {Error} [cause] - Optional cause of the error
 */
export class TransportConfigError extends TransportError {
  constructor(transport: string, configIssue: string, cause?: Error) {
    super(`Transport configuration error: ${configIssue}`, transport, cause)
    this.name = 'TransportConfigError'
  }
}

/**
 * Transport Write Error Class
 *
 * Used when a write operation fails for a transport.
 * Provides specific error handling for write-related issues.
 *
 * @extends {TransportError}
 * @param {string} transport - Name of the transport where the error occurred
 * @param {string} writeError - Description of the write error
 * @param {Error} [cause] - Optional cause of the error
 */
export class TransportWriteError extends TransportError {
  constructor(transport: string, writeError: string, cause?: Error) {
    super(`Transport write error: ${writeError}`, transport, cause)
    this.name = 'TransportWriteError'
  }
}
