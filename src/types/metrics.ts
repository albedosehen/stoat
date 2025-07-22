/**
 * Stoat Performance Metrics Schema
 * Defines the structure for performance metrics collected during operations.
 * @module
 */
import { z } from 'zod'
import { MemoryDeltaBase } from './memory.ts'

/**
 * Performance metrics schema base.
 * Represents the performance metrics for an operation.
 *
 * @property {string} operation - Identifier for the operation.
 * @property {number} duration - Duration of the operation in milliseconds.
 * @property {MemoryDeltaBase} memoryDelta - Memory usage change during the operation.
 */
const PerformanceMetricsBase = z.object({
  operation: z.string().describe('Operation identifier'),
  duration: z.number().describe('Duration in milliseconds'),
  memoryDelta: MemoryDeltaBase.describe('Memory usage change'),
})

/**
 * Schema for performance metrics with a timestamp.
 * Extends the base performance metrics schema to include a timestamp.
 *
 * @property {Date} timestamp - When the metrics were captured.
 */
export const PerformanceMetricsSchemaRaw = PerformanceMetricsBase.extend({
  timestamp: z.date().describe('When metrics were captured'),
})

/**
 * Schema for performance metrics with a timestamp as an ISO string.
 * Extends the base performance metrics schema to include a timestamp in ISO format.
 */
export const PerformanceMetricsSchema = PerformanceMetricsBase.extend({
  timestamp: z.string().describe('When metrics were captured (ISO string)'),
})

/**
 * Type definitions for performance metrics and memory delta.
 */
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>

/**
 * Raw type definitions for performance metrics and memory delta.
 */
export type PerformanceMetricsRaw = z.infer<typeof PerformanceMetricsSchemaRaw>

