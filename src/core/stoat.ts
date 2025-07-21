/**
 * Stoat logger - modern, multi-purpose logger for high-performance applications
 * @module
 */
import { Timer } from './timer.ts'
import {
  DEFAULT_STOAT_CONFIG,
  LOG_LEVEL,
  LOG_LEVEL_PRIORITY,
  type LogLevel,
  type StoatConfig,
  type StoatContext,
  type StoatMessage,
} from '../schema/mod.ts'

/**
 * Ultra-simple synchronous logger for high-performance trading applications
 * Console-first with optional simple file appending - completely fire-and-forget
 */
export class stoat {
  private lastLoggedMessage: StoatMessage | null = null

  private constructor(
    private config: StoatConfig,
    private context: StoatContext,
  ) {}

  /**
   * Factory method to create a logger instance (synchronous)
   * @param config Partial configuration, merged with defaults
   * @returns Logger instance directly
   */
  static create(config?: Partial<StoatConfig>): stoat {
    const mergedConfig: StoatConfig = {
      ...DEFAULT_STOAT_CONFIG,
      ...config,
    }

    // Create default context with module and metadata from config
    const context: StoatContext = {
      sessionId: crypto.randomUUID(),
      ...(mergedConfig.module && { module: mergedConfig.module }),
      ...(mergedConfig.metadata && { metadata: mergedConfig.metadata }),
    }

    // Only create output directory if outputDir is specified
    if (mergedConfig.outputDir) {
      try {
        Deno.mkdirSync(mergedConfig.outputDir, { recursive: true })
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists)) {
          // Silent fail - console logging will still work
        }
      }
    }

    return new stoat(mergedConfig, context)
  }

  /**
   * Create a child logger with inherited context and optional config overrides
   * @param options Context and config to merge with parent
   * @returns New logger instance with merged context and config
   */
  child(
    options: Partial<StoatContext & Pick<StoatConfig, 'outputDir' | 'prettyPrint' | 'module' | 'metadata'>>,
  ): stoat {
    // Separate context and config options
    const { outputDir, prettyPrint, module, metadata, ...contextOptions } = options

    // Create child config, inheriting from parent but allowing overrides
    const childConfig: StoatConfig = {
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
      ...(childConfig.module && { module: childConfig.module }),
      ...(childConfig.metadata && { metadata: childConfig.metadata }),
    }

    return new stoat(childConfig, childContext)
  }

  /**
   * Create a performance timer for operation tracking
   * @param operation Name of the operation being timed
   * @returns Timer instance for tracking performance
   */
  timer(operation: string): Timer {
    return new Timer(operation, this.context)
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
    const level = entry.level.toUpperCase().padEnd(5)
    const context = this.formatContext(entry.context)

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

    // Add module if present in context
    if (entry.context.module) {
      jsonEntry.module = entry.context.module
    }

    // Add metadata if present in context
    if (entry.context.metadata) {
      jsonEntry.metadata = entry.context.metadata
    }

    // Add data as payload if present
    if (entry.data !== undefined) {
      jsonEntry.payload = entry.data
    }

    // Add other context fields
    const contextFields: Record<string, unknown> = {}
    if (entry.context.sessionId) contextFields.sessionId = entry.context.sessionId
    if (entry.context.orderId) contextFields.orderId = entry.context.orderId
    if (entry.context.symbol) contextFields.symbol = entry.context.symbol
    if (entry.context.strategy) contextFields.strategy = entry.context.strategy
    if (entry.context.agentId) contextFields.agentId = entry.context.agentId
    if (entry.context.portfolioId) contextFields.portfolioId = entry.context.portfolioId
    if (entry.context.requestId) contextFields.requestId = entry.context.requestId

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
