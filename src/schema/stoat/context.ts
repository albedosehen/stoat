import { z } from 'zod'

const StoatContextBase = z.object({
  orderId: z.string().optional().describe('Associated order ID'),
  symbol: z.string().optional().describe('Trading symbol'),
  strategy: z.string().optional().describe('Trading strategy identifier'),
  agentId: z.string().optional().describe('Agent identifier'),
  portfolioId: z.string().optional().describe('Portfolio identifier'),
  sessionId: z.string().describe('Session identifier'),
  requestId: z.string().optional().describe('Request identifier'),
  module: z.string().optional().describe('Module identifier for context tracking'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata to include in context'),
})

// Recursive type handling with z.lazy()
type StoatContextRawType = z.infer<typeof StoatContextBase> & {
  parentContext?: StoatContextRawType
}

type StoatContextType = z.infer<typeof StoatContextBase> & {
  parentContext?: StoatContextType
}

export const StoatContextSchemaRaw: z.ZodType<StoatContextRawType> = StoatContextBase.extend({
  parentContext: z.lazy(() => StoatContextSchemaRaw).optional().describe('Parent context reference'),
})

export const StoatContextSchema: z.ZodType<StoatContextType> = StoatContextBase.extend({
  parentContext: z.lazy(() => StoatContextSchema).optional().describe('Parent context reference'),
})

export type StoatContext = z.infer<typeof StoatContextSchema>
export type StoatContextRaw = z.infer<typeof StoatContextSchemaRaw>
