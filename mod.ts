/**
 * Main Stoat Module Export
 * @module
 */

export {
  AsyncTransportError,
  BufferOverflowError,
  CircularReferenceError,
  ConfigurationError,
  DataRedactionError,
  EnvironmentConfigError,
  ErrorBoundary,
  FileTransportError,
  InputSanitizationError,
  PerformanceError,
  TransportError,
  PluginError,
  RateLimitExceededError,
  SchemaValidationError,
  SecurityError,
  SerializationError,
  StoatError,
  ValidationError,
  createErrorContext,
  type StoatErrorContext,
  type ErrorBoundaryConfig,
  type ErrorBoundaryHandler,
} from './src/errors/errors.ts'

export {
  AsyncLogger,
  createAsyncLogger,
  getAsyncConfig,
  ASYNC_CONFIGS,
  type AsyncConfig,
  type AsyncLoggerConfig,
  type AsyncMetrics,
  type BufferEntry,
  type FlushStrategy,
} from './src/loggers/async-logger.ts'

export {
  StructuredLogger,
  createStructuredEntry,
  createStructuredLogger,
  serializeLogEntry,
  type FieldMapping,
  type SerializationOptions,
  type StructuredError,
  type StructuredLogEntry,
}from './src/loggers/structured-log-entry.ts'

export * from './src/services/mod.ts'

export { stoat } from './src/stoat/stoat.ts'

