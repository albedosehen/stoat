import { z } from 'zod'
import { EnumValues } from '../../../utils/enumerators.ts'
import { LOG_LEVEL } from './enums.ts'
import { StoatContextSchema, StoatContextSchemaRaw } from './context.ts'
import { PerformanceMetricsSchema, PerformanceMetricsSchemaRaw } from '../performance/metrics.ts'

const StoatMessageBase = z.object({
  level: z.enum(EnumValues(LOG_LEVEL)).describe('Log level'),
  message: z.string().describe('Log message'),
  data: z.unknown().optional().describe('Additional log data'),
  context: StoatContextSchema.describe('Log context information'),
  performance: PerformanceMetricsSchema.optional().describe('Performance metrics if available'),
})

// Raw schema (for internal processing)
export const StoatMessageSchemaRaw = StoatMessageBase.extend({
  timestamp: z.date().describe('Log entry timestamp'),
  id: z.string().optional().describe('Internal log entry ID'),
  context: StoatContextSchemaRaw.describe('Log context information'),
  performance: PerformanceMetricsSchemaRaw.optional().describe('Performance metrics if available'),
})

// Serialized schema (for API responses)
export const StoatMessageSchema = StoatMessageBase.extend({
  timestamp: z.string().describe('Log entry timestamp (ISO string)'),
  id: z.string().optional().describe('Normalized log entry ID'),
})

export type StoatMessage = z.infer<typeof StoatMessageSchema>
export type StoatMessageRaw = z.infer<typeof StoatMessageSchemaRaw>
