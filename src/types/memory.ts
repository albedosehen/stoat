/**
 * Stoat Memory Types
 * This module defines various memory-related types used in the Stoat system.
 * @module
 */
import { z } from 'zod'

/**
 * Memory Type Enum
 *
 * @property {string} Rss - Resident Set Size memory usage.
 * @property {string} HeapUsed - Used heap memory.
 * @property {string} HeapTotal - Total heap memory allocated.
 * @property {string} External - External memory usage.
 */
export const MEMORY_TYPE = {
  Rss: 'rss',
  HeapUsed: 'heap_used',
  HeapTotal: 'heap_total',
  External: 'external',
} as const

/**
 * Memory Type
 */
export type MemoryType = typeof MEMORY_TYPE[keyof typeof MEMORY_TYPE]

/**
 * Base schema for memory delta metrics.
 * Represents the change in memory usage during an operation.
 *
 * @property {number} rss - Resident Set Size change in bytes.
 * @property {number} heapUsed - Change in heap used in bytes.
 * @property {number} heapTotal - Change in total heap size in bytes.
 * @property {number} external - Change in external memory usage in bytes.
 */
export const MemoryDeltaBase = z.object({
  rss: z.number().describe('Resident Set Size change'),
  heapUsed: z.number().describe('Heap used change'),
  heapTotal: z.number().describe('Heap total change'),
  external: z.number().describe('External memory change'),
})

/**
 * Type definition for memory delta.
 */
export type MemoryDelta = z.infer<typeof MemoryDeltaBase>
