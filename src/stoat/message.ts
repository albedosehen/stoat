/**
 * Stoat Message Schema
 * This module defines the schema for log messages in the Stoat system.
 * @abstract,pdi
 */
import { z } from 'zod'
import { EnumValues } from '../utils/helpers.ts'
import { LOG_LEVEL } from '../types/log.ts'
import { StoatContextSchema, StoatContextSchemaRaw } from './context.ts'
import { PerformanceMetricsSchema, PerformanceMetricsSchemaRaw } from '../performance/metrics.ts'

/**
 * Stoat Message Base Schema
 * This schema defines the structure of log messages used in Stoat logging.
 *
 * @property {LogLevel} level - Log level of the message.
 * @property {string} message - The log message content.
 * @property {unknown} [data] - Optional additional data associated with the log message.
 * @property {StoatContextSchema} context - Context information for the log message.
 * @property {PerformanceMetricsSchema} [performance] - Optional performance metrics if available.
 */
const StoatMessageBase = z.object({
  level: z.enum(EnumValues(LOG_LEVEL)).describe('Log level'),
  message: z.string().describe('Log message'),
  data: z.unknown().optional().describe('Additional log data'),
  context: StoatContextSchema.describe('Log context information'),
  performance: PerformanceMetricsSchema.optional().describe('Performance metrics if available'),
})

/**
 * Raw schema (for internal processing)
 * This schema is used for internal processing of log messages.
 *
 * @property {Date} timestamp - Timestamp of the log entry.
 * @property {string} [id] - Internal log entry ID.
 * @property {StoatContextSchemaRaw} context - Context information for the log message.
 * @property {PerformanceMetricsSchemaRaw} [performance] - Optional performance metrics if available.
 */
export const StoatMessageSchemaRaw = StoatMessageBase.extend({
  timestamp: z.date().describe('Log entry timestamp'),
  id: z.string().optional().describe('Internal log entry ID'),
  context: StoatContextSchemaRaw.describe('Log context information'),
  performance: PerformanceMetricsSchemaRaw.optional().describe('Performance metrics if available'),
})

/**
 * Serialized schema (API responses)
 * This schema is used for API responses containing log messages.
 *
 * @property {string} timestamp - Timestamp of the log entry in ISO string format.
 * @property {string} [id] - Normalized log entry ID.
 */
export const StoatMessageSchema = StoatMessageBase.extend({
  timestamp: z.string().describe('Log entry timestamp (ISO string)'),
  id: z.string().optional().describe('Normalized log entry ID'),
})

/**
 * Stoat Message Type
 */
export type StoatMessage = z.infer<typeof StoatMessageSchema>

/**
 * Stoat Message Raw Type
 */
export type StoatMessageRaw = z.infer<typeof StoatMessageSchemaRaw>
