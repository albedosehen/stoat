/**
 * Stoat Performance Metrics Schema
 * Defines the structure for performance metrics collected during operations.
 * @module
 */
import type { MemoryDeltaBase } from './memory.ts'

/**
 * Performance metrics interface with a timestamp as an ISO string.
 * Represents the performance metrics for an operation with timestamp.
 *
 * @property {string} operation - Identifier for the operation.
 * @property {number} duration - Duration of the operation in milliseconds.
 * @property {MemoryDeltaBase} memoryDelta - Memory usage change during the operation.
 * @property {string} timestamp - When the metrics were captured (ISO string).
 */
export interface PerformanceMetricsSchema {
  /** Operation identifier */
  operation: string
  /** Duration in milliseconds */
  duration: number
  /** Memory usage change */
  memoryDelta: MemoryDeltaBase
  /** When metrics were captured (ISO string) */
  timestamp: string
}

/**
 * Type definitions for performance metrics.
 */
export type PerformanceMetrics = PerformanceMetricsSchema
