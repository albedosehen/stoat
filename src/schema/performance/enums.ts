export const PERFORMANCE_OPERATION = {
  Execute: 'execute',
  Process: 'process',
  Validate: 'validate',
  Transform: 'transform',
  Write: 'write',
  Read: 'read',
} as const
export type PerformanceOperation = typeof PERFORMANCE_OPERATION[keyof typeof PERFORMANCE_OPERATION]

export const MEMORY_TYPE = {
  Rss: 'rss',
  HeapUsed: 'heap_used',
  HeapTotal: 'heap_total',
  External: 'external',
} as const
export type MemoryType = typeof MEMORY_TYPE[keyof typeof MEMORY_TYPE]
