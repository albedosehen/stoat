/**
 * Stoat Types Module
 * This module exports various types and interfaces used throughout the Stoat logging system.
 * @module
 */

// Brands - unique identifiers for various entities in Stoat
export {
  createAgentId,
  createLogMessage,
  createOperationId,
  createOrderId,
  createPortfolioId,
  createRedacted,
  createRequestId,
  createSanitized,
  createSessionId,
  createSpanId,
  createStrategyId,
  createSymbol,
  createTimestamp,
  createTraceId,
  markSensitive,
  type AgentId,
  type LogLevel,
  type LogLevelNumeric,
  type LogLevelString,
  type LogMessage,
  type OperationId,
  type OrderId,
  type PluginContext,
  type PluginHook,
  type PortfolioId,
  type RedactedData,
  type RequestId,
  type SanitizedInput,
  type SensitiveData,
  type SerializerKey,
  type SerializerValue,
  type SessionId,
  type SpanId,
  type StrategyId,
  type Symbol,
  type Timestamp,
  type TraceId,
} from './brands.ts'

// Configuration - main configuration interfaces
export {
  type ContextConfig,
  type ErrorBoundaryConfig,
  type ObservabilityConfig,
  type PerformanceConfig,
  type PluginConfig,
  type SecurityConfig,
} from './config.ts'

// Defaults - default configurations for Stoat
export {
  DEFAULT_CONFIGS,
  type EnvironmentConfig,
} from './defaults.ts'

// Environment - environment variable utilities
export {
  getEnvVarName,
  normalizeEnvValue,
  ENV_VAR_MAPPING,
  STOAT_ENV_PREFIX,
} from './environment.ts'

// Log Levels - core logging level definitions
export {
  getLogLevelColor,
  getLogLevelValue,
  shouldLogLevel,
  LOG_DISPLAY_CONFIG,
  LOG_LEVEL_CONFIG,
  LOG_LEVEL_NAMES,
  LOG_LEVEL_VALUES,
  LOG_SEVERITY_COLORS,
  type CustomLogLevel,
  type LevelFilter,
  type LevelHierarchy,
  type LogColor,
  type LogLevelConfig,
  type LogLevelName,
  type LogLevelValue,
  type TimeBasedFilter,
} from './logLevels.ts'

// Transports - transport configuration and types
export {
  TRANSPORT_TYPES,
  type AsyncTransport,
  type ConsoleTransportInterface,
  type CustomTransport,
  type FileTransport,
  type MemoryTransport,
  type TransportBase,
  type TransportConfig,
  type TransportType,
} from './transports.ts'

// Validation - configuration validation functions
export {
  ConfigValidationError,
  applyConfigDefaults,
  applyTransportDefaults,
  isValidLogLevel,
  isValidTransportType,
  validateConfig,
  validateTransport,
} from './validation.ts'

/** Legacy exports
 * These exports are maintained for backward compatibility but will be removed in future versions.
 *
 * These will be changed to be part of a planned plugin system in stoat.
 */
//
export {
  MEMORY_TYPE,
  type MemoryDelta,
  type MemoryDeltaBase,
  type MemoryType
} from './memory.ts'

// Legacy exports for performance metrics
export {
  PERFORMANCE_OPERATION,
  type PerformanceOperation,
  type PerformanceMetrics,
  type PerformanceMetricsSchema
} from './metrics.ts'
