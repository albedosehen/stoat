/**
 * Stoat Configuration Schema
 * This module defines the schema for the Stoat logger configuration.
 * @module
 */
import { z } from 'zod'
import { LOG_LEVEL } from '../types/log.ts'
import { EnumValues } from '../utils/helpers.ts'

/**
 * Stoat Configuration Schema
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
 * @property {boolean} prettyPrint - Whether to enable pretty-print JSON format for
 */
const StoatConfigBase = z.object({
  level: z.enum(EnumValues(LOG_LEVEL)).describe('Minimum log level to process'),
  bufferSize: z.number().default(10000).describe('Buffer size for log entries'),
  flushInterval: z.number().default(1000).describe('Flush interval in milliseconds'),
  maxFileSize: z.number().default(100 * 1024 * 1024).describe('Maximum file size in bytes'),
  maxFiles: z.number().default(10).describe('Maximum number of log files to retain'),
  enablePerformanceTracking: z.boolean().default(true).describe('Enable performance tracking'),
  outputDir: z.string().optional().describe(
    'Output directory for log files - when undefined, console-only logging is used',
  ),
  compress: z.boolean().default(false).describe('Enable log file compression'),
  module: z.string().optional().describe('Module identifier for context tracking'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata to include in all log entries'),
  prettyPrint: z.boolean().default(false).describe('Enable pretty-print JSON format for console output'),
})

/**
 * Raw schema
 */
export const StoatConfigSchemaRaw = StoatConfigBase.extend({}).describe('Raw Logger configuration schema')

/**
 * Serialized schema
 */
export const StoatConfigSchema = StoatConfigBase.extend({}).describe('Serialized Logger configuration schema')

/**
 * Stoat Config Type
 */
export type StoatConfig = z.infer<typeof StoatConfigSchema>

/**
 * Stoat Config Raw Type
 */
export type StoatConfigRaw = z.infer<typeof StoatConfigSchemaRaw>

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
export const DEFAULT_STOAT_CONFIG = StoatConfigSchema.parse({
  level: LOG_LEVEL.Info,
  bufferSize: 10000,
  flushInterval: 1000,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 10,
  enablePerformanceTracking: true,
  compress: false,
  prettyPrint: false,
})
