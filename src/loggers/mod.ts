/**
 * Stoat Service Module Exports
 * @module
 */

export {
  ConsoleTransportService,
  type ConsoleTransportConfig,
  createConsoleTransport
} from './services/console.ts'

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
  StoatAsyncLogger,
  createAsyncLogger,
  getAsyncConfig,
  ASYNC_CONFIGS,
  type AsyncConfig,
  type AsyncLoggerConfig,
  type AsyncMetrics,
  type BufferEntry,
  type FlushStrategy,
} from './async-logger.ts'

// StructuredLogger
export {
  StructuredLogger,
  createStructuredEntry,
  createStructuredLogger,
  serializeLogEntry,
  type FieldMapping,
  type SerializationOptions,
  type StructuredError,
  type StructuredLogEntry,
} from './structured-log-entry.ts'

// BasicLogger
export {
  StoatBasicLogger,
  type BasicConfig,
} from './basic-logger.ts'

// StructuredLogger class wrapper
export {
  StoatStructuredLogger,
  type StructuredConfig,
} from './structured-logger.ts'

// HybridLogger
export {
  StoatHybridLogger,
  type HybridConfig,
} from './hybrid-logger.ts'