/**
 * Stoat Configuration Schema
 * This module defines the schema for the Stoat logger configuration.
 * @module
 */
import { LOG_LEVEL } from '../types/log.ts'
import type { LogLevel } from '../types/log.ts'

/**
 * Stoat Configuration interface
 * Defines the structure for Stoat logger configuration.
 *
 * @property {LogLevel} level - Minimum log level to process.
 * @property {number} bufferSize - Size of the log buffer.
 * @property {number} flushInterval - Interval in milliseconds to flush the log buffer.
 * @property {number} maxFileSize - Maximum size of a log file in bytes.
 * @property {number} maxFiles - Maximum number of log files to retain.
 * @property {boolean} enablePerformanceTracking - Whether to enable performance tracking.
 * @property {string} [outputDir] - Directory to output log files. If undefined, console-only logging is used.
 * @property {boolean} compress - Whether to compress log files
 * @property {string} [module] - Module identifier for context tracking.
 * @property {Record<string, unknown>} [metadata] - Additional metadata to include in all log entries.
 * @property {boolean} prettyPrint - Whether to enable pretty-print JSON format for console output.
 */
export interface StoatConfigSchema {
  /** Minimum log level to process */
  level: LogLevel
  /** Buffer size for log entries */
  bufferSize: number
  /** Flush interval in milliseconds */
  flushInterval: number
  /** Maximum file size in bytes */
  maxFileSize: number
  /** Maximum number of log files to retain */
  maxFiles: number
  /** Enable performance tracking */
  enablePerformanceTracking: boolean
  /** Output directory for log files - when undefined, console-only logging is used */
  outputDir?: string
  /** Enable log file compression */
  compress: boolean
  /** Module identifier for context tracking */
  module?: string
  /** Additional metadata to include in all log entries */
  metadata?: Record<string, unknown>
  /** Enable pretty-print JSON format for console output */
  prettyPrint: boolean
}

/**
 * Stoat Config Type
 */
export type StoatConfig = StoatConfigSchema

/**
 * Default configuration for Logger instances
 *
 * @property {LogLevel} level - Default log level set to Info.
 * @property {number} bufferSize - Default buffer size set to 10000.
 * @property {number} flushInterval - Default flush interval set to 1000 milliseconds.
 * @property {number} maxFileSize - Default maximum file size set to 100MB
 * @property {number} maxFiles - Default maximum number of log files set to 10.
 * @property {boolean} enablePerformanceTracking - Default set to true.
 * @property {boolean} compress - Default set to false, meaning logs are not compressed.
 * @property {boolean} prettyPrint - Default set to false, meaning logs are not pretty
 */
export const DEFAULT_STOAT_CONFIG: StoatConfig = {
  level: LOG_LEVEL.Info,
  bufferSize: 10000,
  flushInterval: 1000,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 10,
  enablePerformanceTracking: true,
  compress: false,
  prettyPrint: false,
}
