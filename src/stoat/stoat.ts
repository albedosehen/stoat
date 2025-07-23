/**
 * Stoat logger - modern, multi-purpose logger for high-performance applications
 * @module
 */
import { Timer } from '../utils/timer.ts'
import { LOG_LEVEL, LOG_LEVEL_PRIORITY, type LogLevel } from '../types/log.ts'
import { DEFAULT_STOAT_TRANSPORT_CONFIG, type StoatTransportConfig } from './config.ts'

import { type StoatMessage } from './message.ts'
import type { StoatContext } from './context.ts'
// Import unified logger classes
import { type BasicConfig, StoatBasicLogger } from '../loggers/basic-logger.ts'
import { type AsyncConfig, StoatAsyncLogger } from '../loggers/async-logger.ts'
import { StoatStructuredLogger, type StructuredConfig } from '../loggers/structured-logger.ts'
import { type HybridConfig, StoatHybridLogger } from '../loggers/hybrid-logger.ts'
import type { StructuredLogEntry } from '../loggers/structured-log-entry.ts'

/**
 * Ultra-simple synchronous logger for low-footprint applications
 * Console-first with optional simple file appending - completely fire-and-forget
 */
export class stoat {
  private lastLoggedMessage: StoatMessage | null = null

  private constructor(
    private config: StoatTransportConfig,
    private context: StoatContext,
  ) {}

  /**
   * Unified factory method with overloaded signatures for different logger types
   *
   * @overload
   * @param config Basic logger configuration
   * @returns StoatBasicLogger instance
   */
  static create(config: { type: 'basic' } & BasicConfig): StoatBasicLogger

  /**
   * @overload
   * @param config Async logger configuration
   * @returns StoatAsyncLogger instance
   */
  static create(config: { type: 'async' } & AsyncConfig): StoatAsyncLogger

  /**
   * @overload
   * @param config Structured logger configuration
   * @returns StoatStructuredLogger instance
   */
  static create(config: { type: 'structured' } & StructuredConfig): StoatStructuredLogger

  /**
   * @overload
   * @param config Hybrid logger configuration
   * @returns StoatHybridLogger instance
   */
  static create(config: { type: 'hybrid' } & HybridConfig): StoatHybridLogger

  /**
   * @overload
   * @param config Legacy basic transport configuration (fallback)
   * @returns StoatBasicLogger instance for backward compatibility
   */
  static create(config?: Partial<StoatTransportConfig>): StoatBasicLogger

  /**
   * Unified factory implementation with intelligent detection
   * @param config Logger configuration with optional type specification
   * @returns Appropriate logger instance based on configuration
   */
  static create(
    config?:
      | Partial<StoatTransportConfig>
      | ({ type: 'basic' } & BasicConfig)
      | ({ type: 'async' } & AsyncConfig)
      | ({ type: 'structured' } & StructuredConfig)
      | ({ type: 'hybrid' } & HybridConfig),
  ): StoatBasicLogger | StoatAsyncLogger | StoatStructuredLogger | StoatHybridLogger {
    // Handle legacy basic logger creation (backward compatibility)
    if (!config || !('type' in config)) {
      // Use existing implementation for basic logger
      const mergedConfig: StoatTransportConfig = {
        ...DEFAULT_STOAT_TRANSPORT_CONFIG,
        ...config,
      }

      // Create default context with module and metadata from config
      const context: StoatContext = {
        sessionId: crypto.randomUUID(),
        ...(mergedConfig.module ? { module: mergedConfig.module } : {}),
        ...(mergedConfig.metadata ? { metadata: mergedConfig.metadata } : {}),
      }

      // Only create output directory if outputDir is specified
      if (mergedConfig.outputDir) {
        try {
          Deno.mkdirSync(mergedConfig.outputDir as string, { recursive: true })
        } catch (error) {
          if (!(error instanceof Deno.errors.AlreadyExists)) {
            // Silent fail - console logging will still work
          }
        }
      }

      return new StoatBasicLogger(mergedConfig as BasicConfig, context)
    }

    // Handle typed logger creation
    switch (config.type) {
      case 'basic': {
        const { type: _type, ...basicConfig } = config
        const mergedConfig: BasicConfig = {
          ...DEFAULT_STOAT_TRANSPORT_CONFIG,
          ...basicConfig,
        }

        const context: StoatContext = {
          sessionId: crypto.randomUUID(),
          ...(mergedConfig.module ? { module: mergedConfig.module } : {}),
          ...(mergedConfig.metadata ? { metadata: mergedConfig.metadata } : {}),
        }

        // Create output directory if needed
        if (mergedConfig.outputDir) {
          try {
            Deno.mkdirSync(mergedConfig.outputDir as string, { recursive: true })
          } catch (error) {
            if (!(error instanceof Deno.errors.AlreadyExists)) {
              // Silent fail
            }
          }
        }

        return new StoatBasicLogger(mergedConfig, context)
      }

      case 'async': {
        const { type: _type, ...asyncConfig } = config

        // Create sync callback for async logger that outputs to console
        const syncCallback = (entry: StructuredLogEntry) => {
          const serialized = JSON.stringify(entry)
          switch (entry.level) {
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

        return new StoatAsyncLogger(asyncConfig, syncCallback)
      }

      case 'structured': {
        const { type: _type, ...structuredConfig } = config
        return new StoatStructuredLogger(structuredConfig)
      }

      case 'hybrid': {
        const { type: _type, ...hybridConfig } = config
        return new StoatHybridLogger(hybridConfig)
      }

      default: {
        const unknownConfig = config as { type: string }
        throw new Error(`Unknown logger type: ${unknownConfig.type}`)
      }
    }
  }

  /**
   * Create a child logger with inherited context and optional config overrides
   * @param options Context and config to merge with parent
   * @returns New logger instance with merged context and config
   */
  child(
    options: Partial<StoatContext & Pick<StoatTransportConfig, 'outputDir' | 'prettyPrint' | 'module' | 'metadata'>>,
  ): stoat {
    // Separate context and config options
    const { outputDir, prettyPrint, module, metadata, ...contextOptions } = options

    // Create child config, inheriting from parent but allowing overrides
    const childConfig: StoatTransportConfig = {
      ...this.config,
    }

    // Handle config overrides explicitly to allow undefined values to override parent
    if ('outputDir' in options) {
      childConfig.outputDir = outputDir
    }
    if (prettyPrint !== undefined) {
      childConfig.prettyPrint = prettyPrint
    }
    if (module !== undefined) {
      childConfig.module = module
    }
    if (metadata !== undefined) {
      childConfig.metadata = metadata
    }

    // Create child context with parent context and new options
    const childContext: StoatContext = {
      ...this.context,
      ...contextOptions,
      sessionId: crypto.randomUUID(),
      parentContext: this.context,
      ...(childConfig.module ? { module: childConfig.module } : {}),
      ...(childConfig.metadata ? { metadata: childConfig.metadata } : {}),
    }

    return new stoat(childConfig, childContext)
  }

  /**
   * Create a performance timer for operation tracking
   * @param operation Name of the operation being timed
   * @returns Timer instance for tracking performance
   */
  timer(operation: string): Timer {
    return new Timer(operation)
  }

  /**
   * Log a trace level message (fire-and-forget)
   * @param message Log message
   * @param data Optional additional data
   */
  trace(message: string, data?: unknown): this {
    this.log(LOG_LEVEL.Trace, message, data)
    return this
  }

  /**
   * Log a debug level message (fire-and-forget)
   * @param message Log message
   * @param data Optional additional data
   */
  debug(message: string, data?: unknown): this {
    this.log(LOG_LEVEL.Debug, message, data)
    return this
  }

  /**
   * Log an info level message (fire-and-forget)
   * @param message Log message
   * @param data Optional additional data
   */
  info(message: string, data?: unknown): this {
    this.log(LOG_LEVEL.Info, message, data)
    return this
  }

  /**
   * Log a warning level message (fire-and-forget)
   * @param message Log message
   * @param data Optional additional data
   */
  warn(message: string, data?: unknown): this {
    this.log(LOG_LEVEL.Warn, message, data)
    return this
  }

  /**
   * Log an error level message (fire-and-forget)
   * @param message Log message
   * @param data Optional additional data
   */
  error(message: string, data?: unknown): this {
    this.log(LOG_LEVEL.Error, message, data)
    return this
  }

  /**
   * Log a fatal level message (fire-and-forget)
   * @param message Log message
   * @param data Optional additional data
   */
  fatal(message: string, data?: unknown): this {
    this.log(LOG_LEVEL.Fatal, message, data)
    return this
  }

  /**
   * Write the last logged message to file explicitly
   * @throws Error if no outputDir is configured or no message has been logged
   */
  write(): this {
    if (!this.config.outputDir) {
      throw new Error('Cannot write to file: outputDir is not configured')
    }
    if (!this.lastLoggedMessage) {
      throw new Error('Cannot write to file: no message has been logged yet')
    }

    try {
      const formatted = this.formatLogEntry(this.lastLoggedMessage)
      const logFile = this.getLogFilePath()
      Deno.writeTextFileSync(logFile, formatted + '\n', { append: true })
    } catch (error) {
      throw new Error(`Failed to write to file: ${error instanceof Error ? error.message : String(error)}`)
    }

    return this
  }

  /**
   * No-op flush method for API compatibility (no buffer to flush)
   */
  flush(): void {
    // No-op - no buffer to flush in ultra-simple implementation
  }

  /**
   * No-op close method for API compatibility (no resources to cleanup)
   */
  close(): void {
    // No-op - no background processes or resources to cleanup
  }

  /**
   * Internal logging method - immediate console output with optional file append
   * @param level Log level
   * @param message Log message
   * @param data Optional additional data
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // Check if message should be logged based on level
    if (LOG_LEVEL_PRIORITY[level as LogLevel] < LOG_LEVEL_PRIORITY[this.config.level as LogLevel]) {
      return
    }

    const entry: StoatMessage = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: this.context,
    }

    // Store the last logged message for .write() method
    this.lastLoggedMessage = entry

    // 1. Console output (primary) - immediate
    this.writeToConsole(entry)

    // 2. File output (secondary) - only if outputDir is configured
    if (this.config.outputDir) {
      this.writeToFile(entry)
    }
  }

  /**
   * Write log entry to console (primary output)
   * @param entry Log entry to write
   */
  private writeToConsole(entry: StoatMessage): void {
    const formatted = this.config.prettyPrint ? this.formatPrettyPrintEntry(entry) : this.formatLogEntry(entry)

    // Use appropriate console method based on level
    switch (entry.level) {
      case LOG_LEVEL.Trace:
      case LOG_LEVEL.Debug:
        console.debug(formatted)
        break
      case LOG_LEVEL.Info:
        console.info(formatted)
        break
      case LOG_LEVEL.Warn:
        console.warn(formatted)
        break
      case LOG_LEVEL.Error:
      case LOG_LEVEL.Fatal:
        console.error(formatted)
        break
      default:
        console.log(formatted)
    }
  }

  /**
   * Write log entry to file (secondary output) - fire-and-forget
   * @param entry Log entry to write
   */
  private writeToFile(entry: StoatMessage): void {
    try {
      const formatted = this.formatLogEntry(entry)
      const logFile = this.getLogFilePath()

      // Simple synchronous file append
      Deno.writeTextFileSync(logFile, formatted + '\n', { append: true })
    } catch {
      // Silent fail - console logging is primary, file is secondary
    }
  }

  /**
   * Format log entry as string
   * @param entry Log entry to format
   * @returns Formatted log string
   */
  private formatLogEntry(entry: StoatMessage): string {
    const timestamp = entry.timestamp
    const level = (entry.level as string).toUpperCase().padEnd(5)
    const context = this.formatContext(entry.context as StoatContext)

    let formatted = `${timestamp} ${level} ${context} ${entry.message}`

    if (entry.data !== undefined) {
      try {
        const dataStr = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)
        formatted += ` | ${dataStr}`
      } catch {
        formatted += ` | [Circular Reference]`
      }
    }

    return formatted
  }

  /**
   * Format log entry as pretty-print JSON
   * @param entry Log entry to format
   * @returns Formatted JSON string
   */
  private formatPrettyPrintEntry(entry: StoatMessage): string {
    const jsonEntry: Record<string, unknown> = {
      level: entry.level,
      time: entry.timestamp,
      msg: entry.message,
    }

    const context = entry.context as StoatContext

    // Add module if present in context
    if (context.module) {
      jsonEntry.module = context.module
    }

    // Add metadata if present in context
    if (context.metadata) {
      jsonEntry.metadata = context.metadata
    }

    // Add data as payload if present
    if (entry.data !== undefined) {
      jsonEntry.payload = entry.data
    }

    // Add other context fields
    const contextFields: Record<string, unknown> = {}
    if (context.sessionId) contextFields.sessionId = context.sessionId
    if (context.orderId) contextFields.orderId = context.orderId
    if (context.symbol) contextFields.symbol = context.symbol
    if (context.strategy) contextFields.strategy = context.strategy
    if (context.agentId) contextFields.agentId = context.agentId
    if (context.portfolioId) contextFields.portfolioId = context.portfolioId
    if (context.requestId) contextFields.requestId = context.requestId

    if (Object.keys(contextFields).length > 0) {
      jsonEntry.context = contextFields
    }

    try {
      return JSON.stringify(jsonEntry, null, 2)
    } catch {
      return JSON.stringify(
        {
          level: entry.level,
          time: entry.timestamp,
          msg: entry.message,
          error: '[Circular Reference]',
        },
        null,
        2,
      )
    }
  }

  /**
   * Format context for display
   * @param context Context to format
   * @returns Formatted context string
   */
  private formatContext(context: StoatContext): string {
    const parts: string[] = []

    if (context.sessionId) parts.push(`session:${context.sessionId.slice(-8)}`)
    if (context.module) parts.push(`module:${context.module}`)
    if (context.orderId) parts.push(`order:${context.orderId}`)
    if (context.symbol) parts.push(`symbol:${context.symbol}`)
    if (context.strategy) parts.push(`strategy:${context.strategy}`)
    if (context.agentId) parts.push(`agent:${context.agentId}`)
    if (context.portfolioId) parts.push(`portfolio:${context.portfolioId}`)
    if (context.requestId) parts.push(`req:${context.requestId}`)

    return `[${parts.join(' ')}]`
  }

  /**
   * Get the current log file path
   * @returns Path to current log file
   * @throws Error if outputDir is not configured
   */
  private getLogFilePath(): string {
    if (!this.config.outputDir) {
      throw new Error('Cannot get log file path: outputDir is not configured')
    }
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return `${this.config.outputDir}/app-${date}.log`
  }
}
