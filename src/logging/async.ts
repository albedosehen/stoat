/**
 * Async logging system for high-performance scenarios
 *
 * Optimized for ultra-low latency while maintaining data integrity. It features:
 * - Zero-allocation fast path for high-frequency trading
 * - Automatic backpressure handling
 * - Configurable flush strategies
 * - Memory pressure management with sync fallback
 * - Detailed performance metrics
 *
 * Note: I'm not sure if this should be coupled with Stoat or if stoat should support plugins that can use features like this.
 *      This is just a first pass at an async logger that can be used in Stoat, and is carry-over functionality from the beginnings of Stoat.
 */

import type { LogLevelName } from '../config/schema.ts'
import type { StructuredLogEntry } from './structured.ts'
import { createErrorContext, PerformanceError } from '../types/errors.ts'

/**
 * Branded type for async logger entries
 *
 * This type is used to ensure that all entries logged through the async logger
 * conform to the expected structure and can be processed correctly.
 */
export interface BufferEntry {
  /** Unique identifier for the log entry */
  readonly id: string

  /** Timestamp when the entry was created */
  readonly timestamp: number

  /** The log entry itself */
  readonly entry: StructuredLogEntry

  /** Priority level for processing */
  readonly priority: number

  /** Retry count for failed writes */
  retryCount: number
}

/**
 * Configuration interface for the async logger
 *
 * This interface defines the configuration options available for the async logger,
 * allowing customization of buffer sizes, flush intervals, and other performance-related settings.
 */
export interface AsyncConfig {
  /** Size of the initial buffer for log entries */
  bufferSize: number

  /** Maximum size of the buffer before backpressure is applied */
  maxBufferSize: number

  /** Interval in milliseconds for flushing buffered entries */
  flushInterval: number

  /** Size of each batch when flushing entries */
  batchSize: number

  /** Whether to synchronize logging on application exit */
  syncOnExit: boolean

  /** Whether to enable backpressure handling */
  enableBackpressure: boolean

  /** Maximum number of retries for failed writes */
  maxRetries: number

  /** Delay in milliseconds before retrying a failed write */
  retryDelay: number

  /** Priority levels for log entries */
  priorityLevels: Record<LogLevelName, number>

  /** Whether to enable sync fallback for critical scenarios */
  syncFallback: boolean

  /** Memory threshold for enabling sync fallback */
  syncThreshold: number
}

/**
 * Performance metrics for monitoring the async logger
 *
 * This interface defines the metrics collected by the async logger,
 * providing insights into buffer usage, flush performance, and error rates.
 */
export interface AsyncMetrics {
  /** Total number of entries buffered */
  entriesBuffered: number

  /** Total number of entries flushed */
  entriesFlushed: number

  /** Total number of entries dropped */
  entriesDropped: number

  /** Count of flush operations performed */
  flushCount: number

  /** Average time taken for flush operations */
  averageFlushTime: number

  /** Current buffer utilization as a percentage */
  bufferUtilization: number

  /** Count of backpressure events triggered */
  backpressureEvents: number

  /** Count of sync fallback events triggered */
  syncFallbackEvents: number

  /** Count of errors encountered during logging */
  errorCount: number

  /** Total number of entries processed */
  processed: number

  /** Total number of logs processed since logger creation */
  totalLogsProcessed: number

  /** Average processing time per log entry */
  averageProcessingTime: number
}

/**
 * Flush strategies for the async logger.
 *
 * Defines how and when buffered log entries are flushed to their destination,
 * providing flexible control over performance and consistency.
 *
 * - `'immediate'`: Flush entries immediately, bypassing the buffer.
 * - `'batch'`: Flush entries once the buffer reaches a configured size.
 * - `'interval'`: Flush entries at regular time intervals.
 * - `'hybrid'`: Combine batch and interval flushing for optimized performance.
 */
export type FlushStrategy = 'immediate' | 'batch' | 'interval' | 'hybrid'

/**
 * Async Logger class for handling asynchronous logging
 *
 * This class implements a high-performance logging system.
 *
 * @class
 * @param {AsyncConfig} config - Configuration options for the async logger
 * @param {Function} [syncCallback] - Optional synchronous callback for critical logging scenarios
 * @throws {Error} If the logger is destroyed and an attempt to log is made
 *
 * @example
 * const logger = new AsyncLogger({
 *  bufferSize: 1000,
 *  maxBufferSize: 5000,
 *  flushInterval: 1000,
 *  batchSize: 100,
 *  syncOnExit: true,
 *  enableBackpressure: true,
 *  maxRetries: 3,
 *  retryDelay: 100,
 *  priorityLevels: {
 *    trace: 10,
 *    debug: 20,
 *    info: 30,
 *    warn: 40,
 *    error: 50,
 *    fatal: 60,
 *  },
 *  syncFallback: true,
 *  syncThreshold: 100 * 1024 * 1024, // 100MB
 * });
 *
 * // Log an entry asynchronously
 * await logger.log({
 *   level: 'info',
 *   message: 'This is an async log entry',
 *   timestamp: Date.now(),
 * });
 *
 * // Flush all buffered entries
 * await logger.flush();
 *
 * // Get current performance metrics
 * const metrics = logger.getMetrics();
 * console.log(metrics);
 */
export class AsyncLogger {
  private buffer: BufferEntry[] = []
  private flushTimer: number | null = null
  private isDestroyed = false
  private isFlushing = false
  private flushPromise: Promise<void> | null = null
  private metrics: AsyncMetrics
  private config: AsyncConfig
  private memoryUsage = 0
  private entryIdCounter = 0
  private fastBuffer: StructuredLogEntry[] = []
  private fastBufferSize = 0
  private syncMode = false
  private syncCallback?: (entry: StructuredLogEntry) => void

  constructor(config: AsyncConfig, syncCallback?: (entry: StructuredLogEntry) => void) {
    this.config = config
    this.syncCallback = syncCallback

    this.metrics = {
      entriesBuffered: 0,
      entriesFlushed: 0,
      entriesDropped: 0,
      flushCount: 0,
      averageFlushTime: 0,
      bufferUtilization: 0,
      backpressureEvents: 0,
      syncFallbackEvents: 0,
      errorCount: 0,
      processed: 0,
      totalLogsProcessed: 0,
      averageProcessingTime: 0,
    }

    this.startFlushTimer()
    this.setupExitHandlers()
  }

  /**
   * Asynchronously log an entry
   *
   * Logs an entry to the async logger, handling memory pressure and performance optimizations.
   *
   * @param {StructuredLogEntry} entry - The log entry to be logged
   * @throws {Error} If the logger has been destroyed
   * @returns {Promise<void>} Resolves when the entry has been logged
   *
   * @example
   * await logger.log({
   *  level: 'info',
   *  message: 'This is an async log entry',
   * });
   */
  async log(entry: StructuredLogEntry): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('AsyncLogger has been destroyed')
    }

    if (this.shouldUseSyncFallback()) {
      this.logSync(entry)
      return
    }

    if (this.shouldUseFastPath(entry)) {
      this.logFast(entry)
      return
    }

    await this.logAsync(entry)
  }

  /**
   * Synchronously log an entry
   *
   * Logs an entry synchronously, bypassing the async buffer.
   * This is used for critical logging scenarios where immediate consistency is required.
   *
   * @param {StructuredLogEntry} entry - The log entry to be logged
   * @returns {void}
   *
   * @example
   * logger.logSync({
   *  level: 'error',
   *  message: 'Critical error occurred',
   * });
   */
  logSync(entry: StructuredLogEntry): void {
    try {
      if (this.syncCallback) {
        this.syncCallback(entry)
        this.metrics.syncFallbackEvents++
      } else {
        // Fallback to console if no sync callback
        console.log(JSON.stringify(entry))
      }
    } catch (error) {
      this.metrics.errorCount++
      // TODO(@albedosehen): Consider this usecase further and whether it should be handled differently
      // Logger fallback to avoid any crashes
      console.error('[STOAT AsyncLogger] Sync fallback failed:', error)
    }
  }

  /**
   * Log an entry using the fast path
   *
   * This method is optimized for high-frequency logging scenarios,
   * using a pre-allocated buffer to minimize allocations.
   *
   * @param {StructuredLogEntry} entry - The log entry to be logged
   * @returns {void}
   */
  private logFast(entry: StructuredLogEntry): void {
    // Use pre-allocated buffer for zero-allocation logging
    if (this.fastBufferSize < 1000) {
      this.fastBuffer[this.fastBufferSize] = entry
      this.fastBufferSize++

      if (this.fastBufferSize > 800) {
        this.flushFastBuffer()
      }
    } else {
      // Overflow, fallback to async logging
      this.logAsync(entry).catch(() => this.metrics.entriesDropped++)
    }
  }

  /**
   * Dedicated async logging method
   *
   * Handles the actual asynchronous logging of entries,
   * managing buffer capacity and backpressure.
   *
   * @param {StructuredLogEntry} entry - The log entry to be logged
   * @returns {Promise<void>} Resolves when the entry has been logged
   * @throws {PerformanceError} If the flush operation fails
   *
   * @example
   * await logger.logAsync({
   *   level: 'info',
   *   message: 'This is an async log entry',
   * });
   */
  async logAsync(entry: StructuredLogEntry): Promise<void> {
    const priority = this.config.priorityLevels[entry.level]
    const bufferEntry: BufferEntry = {
      id: this.generateEntryId(),
      timestamp: performance.now(),
      entry,
      priority,
      retryCount: 0,
    }

    // Check buffer capacity
    if (this.buffer.length >= this.config.maxBufferSize) {
      if (this.config.enableBackpressure) {
        this.metrics.backpressureEvents++
        await this.handleBackpressure()
      } else {
        // Drop oldest entry if no backpressure handling
        const dropped = this.buffer.shift()
        if (dropped) {
          this.metrics.entriesDropped++
        }
      }
    }

    // Entry priority handling
    this.insertByPriority(bufferEntry)
    this.metrics.entriesBuffered++
    this.updateMemoryUsage()

    // High priority entries trigger immediate flush
    if (priority >= 50) {
      this.triggerFlush('immediate')
    }
  }

  /**
   * Force flush all buffered entries
   *
   * This method flushes all buffered entries to their destination,
   * ensuring that no logs are lost in case of a crash or shutdown.
   *
   * @returns {Promise<void>}
   * @throws {PerformanceError} If the flush operation fails
   */
  async flush(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise
    }

    this.flushPromise = this.performFlush()

    try {
      await this.flushPromise
    } finally {
      this.flushPromise = null
    }
  }

  /**
   * Get the current metrics of the async logger
   *
   * @returns {AsyncMetrics} The current metrics
   */
  getMetrics(): AsyncMetrics {
    this.metrics.bufferUtilization = this.buffer.length / this.config.maxBufferSize
    return { ...this.metrics }
  }

  /**
   * Update the async logger configuration
   *
   * Updates the configuration of the async logger dynamically,
   * allowing for changes to buffer sizes, flush intervals, and other settings.
   *
   * @param {Partial<AsyncConfig>} config - Partial configuration to update
   * @returns {void}
   *
   * @example
   * logger.updateConfig({
   *  bufferSize: 2000,
   *  flushInterval: 500,
   * });
   */
  updateConfig(config: Partial<AsyncConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart timer if interval changed
    if (config.flushInterval) {
      this.stopFlushTimer()
      this.startFlushTimer()
    }
  }

  /**
   * Check if the async logger is destroyed
   *
   * @returns {boolean} True if the logger is destroyed, false otherwise
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.stopFlushTimer()

    // Final flush
    await this.flush()

    // Clear buffers
    this.buffer = []
    this.fastBuffer = []
    this.fastBufferSize = 0
  }

  /**
   * Check if sync fallback should be used
   *
   * Determines whether to use synchronous logging fallback based on memory pressure
   *
   * @returns {boolean} True if sync fallback should be used, false otherwise
   */
  private shouldUseSyncFallback(): boolean {
    // Use sync fallback when memory pressure is high
    const memoryThreshold = this.config.syncThreshold
    return this.syncMode ||
      this.memoryUsage > memoryThreshold ||
      this.buffer.length > this.config.bufferSize * 0.9
  }

  private shouldUseFastPath(entry: StructuredLogEntry): boolean {
    // Use fast path for high-frequency, simple log entries
    return !entry.error &&
      !entry.data &&
      entry.level !== 'fatal' &&
      this.fastBufferSize < 800
  }

  private async handleBackpressure(): Promise<void> {
    // Strategy 1: Try immediate flush
    if (!this.isFlushing) {
      await this.flush()
      return
    }

    // Strategy 2: Wait for current flush to complete
    if (this.flushPromise) {
      await this.flushPromise
      return
    }

    // Strategy 3: Drop lower priority entries
    this.dropLowPriorityEntries()
  }

  /**
   * Insert a log entry into the buffer by priority,
   * ensuring that higher priority entries are processed first.
   *
   * @param {BufferEntry} entry - The log entry to insert
   * @returns {void}
   */
  private insertByPriority(entry: BufferEntry): void {
    // Simple priority insertion for performance
    let insertIndex = this.buffer.length

    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].priority <= entry.priority) {
        insertIndex = i + 1
        break
      }
      insertIndex = i
    }

    this.buffer.splice(insertIndex, 0, entry)
  }

  /**
   * Drop low priority log entries from the buffer,
   * keeping only entries with priority 40 (warn) and above.
   *
   * @returns {void}
   */
  private dropLowPriorityEntries(): void {
    const originalLength = this.buffer.length
    this.buffer = this.buffer.filter((entry) => entry.priority >= 40) // Keep warn+ only
    this.metrics.entriesDropped += originalLength - this.buffer.length
  }

  private async performFlush(): Promise<void> {
    if (this.buffer.length === 0 && this.fastBufferSize === 0) {
      return
    }

    this.isFlushing = true
    const startTime = performance.now()

    try {
      // Flush fast buffer first
      if (this.fastBufferSize > 0) {
        await this.flushFastBuffer()
      }

      // Flush main buffer in batches
      while (this.buffer.length > 0) {
        const batch = this.buffer.splice(0, this.config.batchSize)
        await this.flushBatch(batch)
      }

      // Update metrics
      const flushTime = performance.now() - startTime
      this.metrics.flushCount++
      this.metrics.averageFlushTime = (this.metrics.averageFlushTime * (this.metrics.flushCount - 1) + flushTime) /
        this.metrics.flushCount
    } catch (error) {
      this.metrics.errorCount++
      throw new PerformanceError(
        `Flush operation failed: ${error instanceof Error ? error.message : String(error)}`,
        createErrorContext({ component: 'async-logger' }),
        error as Error,
      )
    } finally {
      this.isFlushing = false
      this.updateMemoryUsage()
    }
  }

  /**
   * Flush the fast buffer
   *
   * Flushes the fast buffer entries to their destination,
   * ensuring that high-frequency logs are processed efficiently.
   *
   * @returns {Promise<void>}
   */
  private async flushFastBuffer(): Promise<void> {
    if (this.fastBufferSize === 0) return

    const entries = this.fastBuffer.slice(0, this.fastBufferSize)
    this.fastBufferSize = 0

    // Convert to buffer entries for consistent processing
    const bufferEntries: BufferEntry[] = entries.map((entry) => ({
      id: this.generateEntryId(),
      timestamp: performance.now(),
      entry,
      priority: this.config.priorityLevels[entry.level],
      retryCount: 0,
    }))

    await this.flushBatch(bufferEntries)
  }

  /**
   * Flush a batch of log entries
   *
   * @param {BufferEntry[]} batch - The batch of log entries to flush
   * @returns {Promise<void>}
   */
  private async flushBatch(batch: BufferEntry[]): Promise<void> {
    for (const bufferEntry of batch) {
      try {
        if (this.syncCallback) {
          this.syncCallback(bufferEntry.entry)
          this.metrics.entriesFlushed++
        }
      } catch (_error) {
        // Retry logic for failed entries
        if (bufferEntry.retryCount < this.config.maxRetries) {
          bufferEntry.retryCount++
          setTimeout(() => {
            this.buffer.unshift(bufferEntry) // Add back to front for retry
          }, this.config.retryDelay)
        } else {
          this.metrics.entriesDropped++
          this.metrics.errorCount++
        }
      }
    }
  }

  /**
   * Trigger a flush based on the configured strategy
   *
   * @param {FlushStrategy} strategy - The flush strategy to use
   * @returns {void}
   */
  private triggerFlush(strategy: FlushStrategy): void {
    switch (strategy) {
      case 'immediate':
        this.flush().catch(() => this.metrics.errorCount++)
        break
      case 'batch':
        if (this.buffer.length >= this.config.batchSize) {
          this.flush().catch(() => this.metrics.errorCount++)
        }
        break
      case 'interval':
        // Handled by timer
        break
      case 'hybrid':
        if (this.buffer.length >= this.config.batchSize || this.hasHighPriorityEntries()) {
          this.flush().catch(() => this.metrics.errorCount++)
        }
        break
    }
  }

  /**
   * Check if there are high priority entries in the buffer
   *
   * @returns {boolean} True if there are high priority entries, false otherwise
   */
  private hasHighPriorityEntries(): boolean {
    return this.buffer.some((entry) => entry.priority >= 50)
  }

  /**
   * Start the flush timer
   *
   * @returns {void}
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.triggerFlush('interval')
    }, this.config.flushInterval)
  }

  /**
   * Stop the flush timer
   *
   * @returns {void}
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Setup exit handlers for graceful shutdown
   *
   * Ensures that the logger flushes all entries before the application exits,
   * preventing data loss during shutdown.
   *
   * @returns {void}
   */
  private setupExitHandlers(): void {
    if (this.config.syncOnExit) {
      // Handle graceful shutdown
      const exitHandler = () => {
        this.destroy().catch(() => {
          // Best effort cleanup
        })
      }

      // Deno-specific exit handling
      if (typeof Deno !== 'undefined') {
        Deno.addSignalListener('SIGINT', exitHandler)

        // SIGTERM is not supported on Windows, only add on non-Windows platforms
        if (Deno.build.os !== 'windows') {
          Deno.addSignalListener('SIGTERM', exitHandler)
        }
      }

      // Browser/universal exit handling
      if (typeof globalThis.addEventListener === 'function') {
        globalThis.addEventListener('beforeunload', exitHandler)
      }
    }
  }

  /**
   * Update memory usage statistics
   *
   * @returns {void}
   */
  private updateMemoryUsage(): void {
    // Rough estimation of memory usage
    this.memoryUsage = (this.buffer.length + this.fastBufferSize) * 1024 // ~1KB per entry estimate
  }

  /**
   * Generate a unique ID for each log entry
   *
   * @returns {string} Unique identifier for the log entry
   */
  private generateEntryId(): string {
    return `${Date.now()}-${++this.entryIdCounter}`
  }

  /**
   * Enable sync mode for the async logger
   *
   * This method allows the logger to operate in synchronous mode,
   * bypassing the asynchronous buffer and ensuring immediate consistency.
   *
   * @returns {void}
   */
  enableSyncMode(): void {
    this.syncMode = true
  }

  /**
   * Disables synchronous mode for the async logger
   *
   * This method allows the logger to return to its default asynchronous behavior,
   * using the buffer and flush strategies defined in the configuration.
   *
   * @returns {void}
   */
  disableSyncMode(): void {
    this.syncMode = false
  }

  /**
   * Check if currently in sync mode
   *
   * @returns {boolean} True if in sync mode, false otherwise
   */
  isSyncMode(): boolean {
    return this.syncMode
  }
}

/**
 * Predefined async logger configurations for different scenarios
 *
 * These configurations provide optimized settings for various use cases,
 * such as trading, web applications, and development environments.
 */
export const ASYNC_CONFIGS = {
  trading: {
    bufferSize: 1000,
    maxBufferSize: 5000,
    flushInterval: 100, // Very fast for trading
    batchSize: 50,
    syncOnExit: true,
    enableBackpressure: true,
    maxRetries: 1, // Limited retries for performance
    retryDelay: 10,
    priorityLevels: {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60,
    },
    syncFallback: true,
    syncThreshold: 50 * 1024 * 1024, // 50MB
  },

  web: {
    bufferSize: 500,
    maxBufferSize: 2000,
    flushInterval: 1000,
    batchSize: 100,
    syncOnExit: true,
    enableBackpressure: true,
    maxRetries: 3,
    retryDelay: 100,
    priorityLevels: {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60,
    },
    syncFallback: true,
    syncThreshold: 100 * 1024 * 1024, // 100MB
  },

  development: {
    bufferSize: 100,
    maxBufferSize: 500,
    flushInterval: 500,
    batchSize: 20,
    syncOnExit: false,
    enableBackpressure: false,
    maxRetries: 0,
    retryDelay: 0,
    priorityLevels: {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60,
    },
    syncFallback: false,
    syncThreshold: 10 * 1024 * 1024, // 10MB
  },
} as const

/**
 * Create an instance of the async logger with the given configuration
 *
 * @param {AsyncConfig} config - Configuration options for the async logger
 * @param {Function} [syncCallback] - Optional synchronous callback for critical logging scenarios
 * @returns {AsyncLogger} An instance of the AsyncLogger
 */
export function createAsyncLogger(
  config: AsyncConfig,
  syncCallback?: (entry: StructuredLogEntry) => void,
): AsyncLogger {
  return new AsyncLogger(config, syncCallback)
}

/**
 * Type alias for the async logger configuration
 */
export type AsyncLoggerConfig = AsyncConfig

/**
 * Get predefined async logger configuration for a specific scenario
 *
 * @param {keyof typeof ASYNC_CONFIGS} scenario - The scenario for which to get the configuration
 * @returns {AsyncConfig} The configuration for the specified scenario
 * @throws {Error} If the scenario is not recognized
 */
export function getAsyncConfig(scenario: keyof typeof ASYNC_CONFIGS): AsyncConfig {
  return { ...ASYNC_CONFIGS[scenario] }
}
