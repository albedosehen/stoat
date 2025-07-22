/**
 * Stoat Service Module Exports
 * @module
 */

export { ConsoleTransport, type ConsoleTransportConfig, createConsoleTransport } from './console.ts'

export {
  type ApplicationContext,
  type BaseContext,
  ContextManager,
  type ContextOptions,
  type ContextValidation,
  createContext,
  getCurrentContext,
  getGlobalContextManager,
  isBaseContext,
  isRequestContext,
  isTradingContext,
  isValidContext,
  type PerformanceContext,
  type RequestContext,
  setCurrentContext,
  type StoatContext,
  type TradingContext,
  withContext,
  withContextAsync,
} from './context-manager.ts'

export {
  compareLevels,
  createCustomLevel,
  type CustomLogLevel,
  getGlobalLevelManager,
  getLevelValue,
  isValidLevelName,
  type LevelFilter,
  type LevelHierarchy,
  LogLevelManager,
  type TimeBasedFilter,
} from './log-level-manager.ts'

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
} from './sanitizer.ts'

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
} from './serializer.ts'

export { Timer } from './timer.ts'

export {
  BaseTransport,
  type BaseTransportConfig,
  type Transport,
  TransportConfigError,
  type TransportDestination,
  TransportError,
  type TransportStats,
  TransportWriteError,
  type WriteResult,
} from './transport.ts'
