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

/**
 * Performance Operation Constant
 *
 * This enum defines various performance operations that can be tracked in the Stoat system.
 *
 * @property {string} Execute - Represents an execution operation.
 * @property {string} Process - Represents a processing operation.
 * @property {string} Validate - Represents a validation operation.
 * @property {string} Transform - Represents a transformation operation.
 * @property {string} Write - Represents a write operation.
 * @property {string} Read - Represents a read operation.
 */
export const PERFORMANCE_OPERATION = {
  Execute: 'execute',
  Process: 'process',
  Validate: 'validate',
  Transform: 'transform',
  Write: 'write',
  Read: 'read',
} as const

/**
 * Performance Operation Type
 */
export type PerformanceOperation = typeof PERFORMANCE_OPERATION[keyof typeof PERFORMANCE_OPERATION]
