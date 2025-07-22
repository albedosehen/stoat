/**
 * Stoat Schema Module
 * This module exports schemas and types for Stoat logging system.
 * It includes configuration, message structures, context definitions, and enumerations for log levels.
 * @module
 */

export {
  DEFAULT_STOAT_CONFIG,
  type StoatConfig,
  type StoatConfigRaw,
  StoatConfigSchema,
  StoatConfigSchemaRaw,
} from './config.ts'

export {
  LOG_LEVEL,
  LOG_LEVEL_CONFIG,
  LOG_LEVEL_PRIORITY,
  LOG_SEVERITY_COLORS,
  type LogColor,
  type LogLevel,
  type LogLevelConfig,
  type LogLevelPriority,
} from '../types/log.ts'

export { type StoatContext, type StoatContextRaw, StoatContextSchema, StoatContextSchemaRaw } from './context.ts'

export { type StoatMessage, type StoatMessageRaw, StoatMessageSchema, StoatMessageSchemaRaw } from './message.ts'
