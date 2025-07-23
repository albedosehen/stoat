/**
 * Stoat Schema Module
 * This module exports schemas and types for Stoat logging system.
 * It includes configuration, message structures, context definitions, and enumerations for log levels.
 * @module
 */

export { DEFAULT_STOAT_CONFIG, DEFAULT_STOAT_TRANSPORT_CONFIG, type StoatTransportConfig, type StoatTransportConfigSchema, type StoatTransportConfig as StoatConfig } from './config.ts'

export { type StoatContext } from './context.ts'

export { type StoatMessage, type StoatMessageSchema } from './message.ts'

export { stoat } from './stoat.ts'
