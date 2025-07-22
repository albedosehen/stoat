/**
 * Console transport implementation for Stoat logger
 * Provides colorized console output with configurable formatting
 * @module
 */

import type { WriteResult } from './transport.ts'
import type { StructuredLogEntry } from '../logging/structured.ts'
import type { StoatContext } from '../context/correlation.ts'
import type { LogLevelName } from '../types/schema.ts'
import { BaseTransport, type BaseTransportConfig, TransportWriteError } from './transport.ts'

/**
 * Console transport specific configuration
 *
 * @property {string} destination - Always 'console'
 * @property {boolean} colors - Whether to use colored output
 * @property {boolean} prettyPrint - Whether to format logs in a human-readable way
 * @property {boolean} useStderr - Whether to write to stderr instead of stdout
 * @property {Partial<Record<LogLevelName, string>>} [colorMap] - Optional custom color mapping for log levels
 */
export interface ConsoleTransportConfig extends BaseTransportConfig {
  readonly destination: 'console'
  readonly colors: boolean
  readonly prettyPrint: boolean
  readonly useStderr: boolean
  readonly colorMap?: Partial<Record<LogLevelName, string>>
}

/**
 * Default color mapping for log levels
 *
 * @property {Record<LogLevelName, string>} - Maps log levels to ANSI color codes
 */
const DEFAULT_COLORS: Record<LogLevelName, string> = {
  trace: '\x1b[90m', // Gray
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  fatal: '\x1b[35m', // Magenta
}

/**
 * ANSI reset color code
 * Used to reset color formatting after colored output
 */
const RESET_COLOR = '\x1b[0m'

/**
 * Console transport implementation
 *
 * @class ConsoleTransport
 * @param {ConsoleTransportConfig} config - Configuration for the console transport
 */
export class ConsoleTransport extends BaseTransport {
  private colorMap: Record<LogLevelName, string>
  private useColors: boolean

  constructor(config: ConsoleTransportConfig) {
    super(config)
    this.colorMap = { ...DEFAULT_COLORS, ...config.colorMap }
    this.useColors = config.colors && this.supportsColor()
  }

  /**
   * Write formatted string to console
   */
  protected async _doWrite(formatted: string): Promise<WriteResult> {
    try {
      const config = this.config as ConsoleTransportConfig
      const output = config.useStderr ? console.error : console.log
      output(formatted.trimEnd())

      return {
        success: true,
        bytesWritten: new TextEncoder().encode(formatted).length,
      }
    } catch (error) {
      throw new TransportWriteError(
        'console',
        `Failed to write to console: ${error instanceof Error ? error.message : String(error)}`,
        error as Error,
      )
    }
  }

  /**
   * Custom formatting for console output
   */
  protected override _customFormat(entry: StructuredLogEntry): string {
    const config = this.config as ConsoleTransportConfig
    if (config.prettyPrint) {
      return this._formatPretty(entry)
    } else {
      return this._formatCompact(entry)
    }
  }

  /**
   * Format as human-readable text with colors
   */
  protected override _formatAsText(entry: StructuredLogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const levelColor = this.useColors ? this.colorMap[entry.level] : ''
    const resetColor = this.useColors ? RESET_COLOR : ''
    const level = `${levelColor}${entry.level.toUpperCase().padEnd(5)}${resetColor}`

    let formatted = `${timestamp} ${level} ${entry.message}`

    // Add trace ID if present
    if (entry.traceId) {
      const traceColor = this.useColors ? '\x1b[90m' : ''
      formatted += ` ${traceColor}[${entry.traceId}]${resetColor}`
    }

    // Add important context fields
    const contextFields = []
    if (entry.component) contextFields.push(`component=${entry.component}`)
    if (entry.function) contextFields.push(`fn=${entry.function}`)
    if (entry.duration !== undefined) contextFields.push(`duration=${entry.duration}ms`)

    if (contextFields.length > 0) {
      const contextColor = this.useColors ? '\x1b[90m' : ''
      formatted += ` ${contextColor}{${contextFields.join(', ')}}${resetColor}`
    }

    return formatted
  }

  /**
   * Pretty-printed format for development
   */
  private _formatPretty(entry: StructuredLogEntry): string {
    const lines: string[] = []
    const timestamp = new Date(entry.timestamp).toISOString()
    const levelColor = this.useColors ? this.colorMap[entry.level] : ''
    const resetColor = this.useColors ? RESET_COLOR : ''
    const grayColor = this.useColors ? '\x1b[90m' : ''

    // Header line
    lines.push(`${grayColor}┌─ ${timestamp} ${levelColor}${entry.level.toUpperCase()}${resetColor}`)

    // Message
    lines.push(`${grayColor}│${resetColor} ${entry.message}`)

    // Trace information
    if (entry.traceId || entry.spanId) {
      const traceInfo = []
      if (entry.traceId) traceInfo.push(`trace=${entry.traceId}`)
      if (entry.spanId) traceInfo.push(`span=${entry.spanId}`)
      lines.push(`${grayColor}│ Trace: ${traceInfo.join(', ')}${resetColor}`)
    }

    // Context information
    if (entry.component || entry.module || entry.function) {
      const contextInfo = []
      if (entry.component) contextInfo.push(`component=${entry.component}`)
      if (entry.module) contextInfo.push(`module=${entry.module}`)
      if (entry.function) contextInfo.push(`function=${entry.function}`)
      lines.push(`${grayColor}│ Context: ${contextInfo.join(', ')}${resetColor}`)
    }

    // Performance metrics
    if (entry.duration !== undefined || entry.memoryUsage !== undefined) {
      const perfInfo = []
      if (entry.duration !== undefined) perfInfo.push(`${entry.duration}ms`)
      if (entry.memoryUsage !== undefined) {
        perfInfo.push(`${Math.round(entry.memoryUsage / 1024)}KB`)
      }
      lines.push(`${grayColor}│ Performance: ${perfInfo.join(', ')}${resetColor}`)
    }

    // Data payload
    if (entry.data) {
      lines.push(`${grayColor}│ Data:${resetColor}`)
      const dataStr = JSON.stringify(entry.data, null, 2)
      const dataLines = dataStr.split('\n')
      for (const dataLine of dataLines) {
        lines.push(`${grayColor}│   ${resetColor}${dataLine}`)
      }
    }

    // Error information
    if (entry.error) {
      lines.push(`${grayColor}│ Error: ${levelColor}${entry.error.name}: ${entry.error.message}${resetColor}`)
      if (entry.error.stack && this.config.format !== 'text') {
        const stackLines = entry.error.stack.split('\n').slice(0, 5) // Limit stack trace
        for (const stackLine of stackLines) {
          lines.push(`${grayColor}│   ${resetColor}${stackLine.trim()}`)
        }
      }
    }

    // Labels/tags
    if (entry.labels || entry.tags) {
      const labelInfo = []
      if (entry.labels) {
        labelInfo.push(...Object.entries(entry.labels).map(([k, v]) => `${k}=${v}`))
      }
      if (entry.tags) {
        labelInfo.push(...entry.tags.map((tag) => `#${tag}`))
      }
      lines.push(`${grayColor}│ Labels: ${labelInfo.join(', ')}${resetColor}`)
    }

    // Footer
    lines.push(`${grayColor}└─${resetColor}`)

    return lines.join('\n')
  }

  /**
   * Compact format for production
   *
   * @private
   * @param {StructuredLogEntry} entry - The log entry to format
   * @returns {string} - Formatted log entry as a single line string
   */
  private _formatCompact(entry: StructuredLogEntry): string {
    const parts = [
      new Date(entry.timestamp).toISOString(),
      entry.level.toUpperCase(),
      entry.message,
    ]

    if (entry.traceId) {
      parts.push(`trace=${entry.traceId}`)
    }

    if (entry.component) {
      parts.push(`component=${entry.component}`)
    }

    if (entry.duration !== undefined) {
      parts.push(`duration=${entry.duration}ms`)
    }

    return parts.join(' ')
  }

  /**
   * Check if the current environment supports colors
   *
   * @private
   * @returns {boolean} - True if colors are supported, false otherwise
   */
  private supportsColor(): boolean {
    // Check for common environment indicators
    if (typeof Deno !== 'undefined') {
      return Deno.stdout.isTerminal()
    }

    // Check Node.js environment variables (if available)
    try {
      // deno-lint-ignore no-explicit-any
      const globalThis_ = globalThis as any
      if (globalThis_.process) {
        return Boolean(
          globalThis_.process.stdout?.isTTY &&
            !globalThis_.process.env.NO_COLOR &&
            globalThis_.process.env.TERM !== 'dumb',
        )
      }
    } catch {
      // Ignore process access errors
    }

    // Default to no colors for unknown environments
    return false
  }

  /**
   * noop
   */
  protected async _cleanup(): Promise<void> {
    /** Console doesn't need cleanup */
  }

  /**
   * Get transport statistics
   *
   * @returns {Object} Statistics object containing total writes, bytes written, and errors
   */
  getStatistics(): { totalWrites: number; totalBytes: number; errors: number } {
    const stats = this.stats
    return {
      totalWrites: stats.messagesWritten,
      totalBytes: stats.bytesWritten,
      errors: stats.errors,
    }
  }

  /**
   * Batch write optimization for console
   *
   * @param {StructuredLogEntry[]} entries - Array of log entries to write
   * @param {StoatContext} [context] - Optional context for the entries
   * @returns {Promise<WriteResult[]>} - Promise resolving to an array of write results for each entry.
   */
  override async writeBatch(entries: StructuredLogEntry[], context?: StoatContext): Promise<WriteResult[]> {
    // For console, we can optimize by batching the output
    const formatted = entries
      .filter((entry) => this.canWrite(entry.level))
      .map((entry) => this._formatEntry(entry, context))

    if (formatted.length === 0) {
      return []
    }

    const batchOutput = formatted.join('')
    const result = await this._doWrite(batchOutput)

    // Return individual results (all same since we batched)
    return entries.map(() => ({
      ...result,
      bytesWritten: result.bytesWritten ? Math.floor(result.bytesWritten / entries.length) : 0,
    }))
  }
}

/**
 * Factory function for creating console transport
 *
 * @param {Partial<ConsoleTransportConfig>} [options={}] - Optional configuration overrides
 * @returns {ConsoleTransport} - Instance of ConsoleTransport with provided configuration
 */
export function createConsoleTransport(options: Partial<ConsoleTransportConfig> = {}): ConsoleTransport {
  const config: ConsoleTransportConfig = {
    destination: 'console',
    enabled: true,
    minLevel: 'info',
    format: 'text',
    async: false,
    colors: true,
    prettyPrint: false,
    useStderr: false,
    ...options,
  }

  return new ConsoleTransport(config)
}
