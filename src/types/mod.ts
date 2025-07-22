// Log Levels - core logging level definitions
export {
  getLogLevelColor,
  getLogLevelValue,
  LOG_DISPLAY_CONFIG,
  LOG_LEVEL_CONFIG,
  LOG_LEVEL_NAMES,
  LOG_LEVEL_VALUES,
  LOG_SEVERITY_COLORS,
  type LogColor,
  type LogLevelConfig,
  type LogLevelName,
  type LogLevelValue,
  shouldLogLevel,
} from './logLevels.ts'

// Transports - transport configuration and types
export {
  type AsyncTransport,
  type ConsoleTransport,
  type CustomTransport,
  type FileTransport,
  type MemoryTransport,
  TRANSPORT_TYPES,
  type TransportBase,
  type TransportConfig,
  type TransportType,
} from './transports.ts'

// Configuration - main configuration interfaces
export {
  type ContextConfig,
  type ErrorBoundaryConfig,
  type ObservabilityConfig,
  type PerformanceConfig,
  type PluginConfig,
  type SecurityConfig,
  type StoatConfig,
} from './config.ts'

// Environment - environment variable utilities
export { ENV_VAR_MAPPING, getEnvVarName, normalizeEnvValue, STOAT_ENV_PREFIX } from './environment.ts'

// Defaults - default configurations
export { DEFAULT_CONFIGS, type EnvironmentConfig } from './defaults.ts'

// Validation - configuration validation functions
export {
  applyConfigDefaults,
  applyTransportDefaults,
  ConfigValidationError,
  isValidLogLevel,
  isValidTransportType,
  validateConfig,
  validateTransport,
} from './validation.ts'

// Legacy exports - keep existing for compatibility
export { MEMORY_TYPE, type MemoryDelta, type MemoryDeltaBase, type MemoryType } from './memory.ts'

export { type PerformanceMetrics, type PerformanceMetricsSchema } from './metrics.ts'

export { PERFORMANCE_OPERATION, type PerformanceOperation } from './performance-operation.ts'
