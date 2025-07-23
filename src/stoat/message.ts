/**
 * Stoat Message Schema
 * This module defines the schema for log messages in the Stoat system.
 * @module
 */
import type { LogLevel } from '../types/log.ts'
import type { StoatContext } from './context.ts'
import type { PerformanceMetrics } from '../types/metrics.ts'

// Re-export LogLevel to make it public for documentation
export type { LogLevel } from '../types/log.ts'

/**
 * Stoat Message Schema
 * This schema defines the structure of log messages used in Stoat logging.
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
