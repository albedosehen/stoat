/**
 * Stoat Service Module Exports
 * @module
 */

export {
  type ConsoleTransportConfig,
  ConsoleTransportService,
  ConsoleTransportService as ConsoleTransport, // Backward compatibility
  createConsoleTransport,
} from './console.ts'

export {
  BaseTransport,
  type BaseTransportConfig,
  type Transport,
  TransportConfigError,
  type TransportDestination,
  TransportErrorBase as TransportError,
  type TransportStats,
  TransportWriteError,
  type WriteResult,
} from './transport.ts'

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
