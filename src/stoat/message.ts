/**
 * Stoat Message Schema
 * This module defines the schema for log messages in the Stoat system.
 * @abstract,pdi
 */
import type { LogLevel } from '../types/log.ts'
import type { StoatContext } from './context.ts'
import type { PerformanceMetrics } from '../types/metrics.ts'

/**
 * Stoat Message Schema
 * This schema defines the structure of log messages used in Stoat logging.
 *
 * @property {LogLevel} level - Log level of the message.
 * @property {string} message - The log message content.
 * @property {unknown} [data] - Optional additional data associated with the log message.
 * @property {StoatContext} context - Context information for the log message.
 * @property {PerformanceMetrics} [performance] - Optional performance metrics if available.
 * @property {string} timestamp - Timestamp of the log entry in ISO string format.
 * @property {string} [id] - Normalized log entry ID.
 */
export interface StoatMessageSchema {
  /** Log level */
  level: LogLevel
  /** Log message */
  message: string
  /** Additional log data */
  data?: unknown
  /** Log context information */
  context: StoatContext
  /** Performance metrics if available */
  performance?: PerformanceMetrics
  /** Log entry timestamp (ISO string) */
  timestamp: string
  /** Normalized log entry ID */
  id?: string
}

/**
 * Stoat Message Type
 */
export type StoatMessage = StoatMessageSchema
