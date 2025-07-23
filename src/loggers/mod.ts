/**
 * Stoat Service Module Exports
 * @module
 */

export { type ConsoleTransportConfig, ConsoleTransportService, createConsoleTransport } from './services/console.ts'

export {
  createSerializer,
  type CustomSerializer,
  type CustomSerializerEngine,
  getDefaultSerializer,
  type SerializationContext,
  type SerializationResult,
  serialize,
  serializeFast,
  type SerializerConfig,
} from '../utils/serializer.ts'

export { Timer } from '../utils/timer.ts'

export {
  BaseTransport,
  type BaseTransportConfig,
  type Transport,
  TransportConfigError,
  type TransportDestination,
  TransportErrorBase,
  type TransportStats,
  TransportWriteError,
  type WriteResult,
} from './services/transport.ts'

export {
  createSanitizer,
  DEFAULT_SENSITIVE_PATTERNS,
  InputSanitizer,
  LOG_INJECTION_PATTERNS,
  REDACTION_REPLACEMENTS,
  type RedactionOptions,
  redactSensitiveData,
  type SanitizationOptions,
  sanitizeInput,
  validateLogInput,
} from './services/sanitizer.ts'

// AsyncLogger
export {
  ASYNC_CONFIGS,
  type AsyncConfig,
  type AsyncLoggerConfig,
  type AsyncMetrics,
  type BufferEntry,
  createAsyncLogger,
  type FlushStrategy,
  getAsyncConfig,
  StoatAsyncLogger,
} from './async-logger.ts'

// StructuredLogger
export {
  createStructuredEntry,
  createStructuredLogger,
  type FieldMapping,
  type SerializationOptions,
  serializeLogEntry,
  type StructuredError,
  type StructuredLogEntry,
  StructuredLogger,
} from './structured-log-entry.ts'

// BasicLogger
export { type BasicConfig, StoatBasicLogger } from './basic-logger.ts'

// StructuredLogger class wrapper
export { StoatStructuredLogger, type StructuredConfig } from './structured-logger.ts'

// HybridLogger
export { type HybridConfig, StoatHybridLogger } from './hybrid-logger.ts'
