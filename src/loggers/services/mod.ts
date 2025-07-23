/**
 * Stoat Service Module Exports
 * @module
 */

export {
  ConsoleTransportService,
  ConsoleTransportService as ConsoleTransport, // Backward compatibility
  type ConsoleTransportConfig,
  createConsoleTransport
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
  type CustomLogLevel,
  type LevelFilter,
  type TimeBasedFilter,
  type LevelHierarchy,
  LogLevelManager,
  getGlobalLevelManager,
  createCustomLevel,
  isValidLevelName,
  compareLevels,
  getLevelValue,
} from './log-level-manager.ts'