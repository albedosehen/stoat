/**
 * Performance Operation Schema
 * This module defines the schema for performance operations in the Stoat system.
 * @module
 */

/**
 * Performance Operation Enum
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
