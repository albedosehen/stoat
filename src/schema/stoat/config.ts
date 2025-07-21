import { z } from 'zod'
import { LOG_LEVEL } from './enums.ts'
import { EnumValues } from '../../../utils/enumerators.ts'

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

// Raw schema (internal processing)
export const StoatConfigSchemaRaw = StoatConfigBase.extend({}).describe('Raw Logger configuration schema')

// Serialized schema (API responses)
export const StoatConfigSchema = StoatConfigBase.extend({}).describe('Serialized Logger configuration schema')

export type StoatConfig = z.infer<typeof StoatConfigSchema>
export type StoatConfigRaw = z.infer<typeof StoatConfigSchemaRaw>

/**
 * Default configuration for Logger instances
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
  // outputDir is optional - when undefined, console-only logging is used
  // module and metadata are optional - when undefined, they're not included
})
