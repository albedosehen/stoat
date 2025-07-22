/**
 * Stoat Context Schema
 * This module defines the schema for context objects in the Stoat system.
 * @module
 */
import { z } from 'zod'

/**
 * Stoat Context Schema
 * This schema defines the structure of context objects used in Stoat logging.
 *
 * @property {string} orderId - Optional associated order ID.
 * @property {string} symbol - Optional trading symbol.
 * @property {string} strategy - Optional trading strategy identifier.
 * @property {string} agentId - Optional agent identifier.
 * @property {string} portfolioId - Optional portfolio identifier.
 * @property {string} sessionId - Required session identifier.
 * @property {string} requestId - Optional request identifier.
 * @property {string} module - Optional module identifier for context tracking.
 * @property {Record<string, unknown>} metadata - Optional additional metadata to include in context.
 */
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

/**
 * Raw type
 */
type StoatContextRawType = z.infer<typeof StoatContextBase> & {
  parentContext?: StoatContextRawType
}

/**
 * Context type
 */
type StoatContextType = z.infer<typeof StoatContextBase> & {
  parentContext?: StoatContextType
}

/**
 * Raw schema
 */
export const StoatContextSchemaRaw: z.ZodType<StoatContextRawType> = StoatContextBase.extend({
  parentContext: z.lazy(() => StoatContextSchemaRaw).optional().describe('Parent context reference'),
})

/**
 * Context schema
 * This schema extends the base context schema to include a reference to a parent context.
 */
export const StoatContextSchema: z.ZodType<StoatContextType> = StoatContextBase.extend({
  parentContext: z.lazy(() => StoatContextSchema).optional().describe('Parent context reference'),
})

export type StoatContext = z.infer<typeof StoatContextSchema>
export type StoatContextRaw = z.infer<typeof StoatContextSchemaRaw>
