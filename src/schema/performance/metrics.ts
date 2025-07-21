import { z } from 'zod'

const MemoryDeltaBase = z.object({
  rss: z.number().describe('Resident Set Size change'),
  heapUsed: z.number().describe('Heap used change'),
  heapTotal: z.number().describe('Heap total change'),
  external: z.number().describe('External memory change'),
})

const PerformanceMetricsBase = z.object({
  operation: z.string().describe('Operation identifier'),
  duration: z.number().describe('Duration in milliseconds'),
  memoryDelta: MemoryDeltaBase.describe('Memory usage change'),
})

export const PerformanceMetricsSchemaRaw = PerformanceMetricsBase.extend({
  timestamp: z.date().describe('When metrics were captured'),
})

export const PerformanceMetricsSchema = PerformanceMetricsBase.extend({
  timestamp: z.string().describe('When metrics were captured (ISO string)'),
})

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>
export type PerformanceMetricsRaw = z.infer<typeof PerformanceMetricsSchemaRaw>
export type MemoryDelta = z.infer<typeof MemoryDeltaBase>
