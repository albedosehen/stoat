/**
 * Stoat Memory Types
 * This module defines various memory-related types used in the Stoat system.
 * @module
 */

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
 * Base interface for memory delta metrics.
 * Represents the change in memory usage during an operation.
 *
 * @property {number} rss - Resident Set Size change in bytes.
 * @property {number} heapUsed - Change in heap used in bytes.
 * @property {number} heapTotal - Change in total heap size in bytes.
 * @property {number} external - Change in external memory usage in bytes.
 */
export interface MemoryDeltaBase {
  /** Resident Set Size change in bytes */
  rss: number
  /** Heap used change in bytes */
  heapUsed: number
  /** Heap total change in bytes */
  heapTotal: number
  /** External memory change in bytes */
  external: number
}

/**
 * Type definition for memory delta.
 */
export type MemoryDelta = MemoryDeltaBase
