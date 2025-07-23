/**
 * Configuration Interfaces for Stoat logging library
 * Defines all configuration types and the main StoatConfig interface
 * @module
 */

import type { LogLevelName } from './logLevels.ts'
import type { TransportConfig } from './transports.ts'

/** Security and data protection configuration interface. */
export interface SecurityConfig {
  /** Whether security features are enabled */
  enabled?: boolean
  /** Whether to sanitize input data automatically */
  sanitizeInputs?: boolean
  /** Array of object paths to redact from logs */
  redactPaths?: string[]
  /** Array of regex patterns to redact from logs */
  redactPatterns?: string[]
  /** Maximum length for string values in logs */
  maxStringLength?: number
  /** Whether to allow circular references in objects */
  allowCircularRefs?: boolean
}

/** Performance optimization and monitoring configuration interface. */
export interface PerformanceConfig {
  /** Whether to enable asynchronous logging for better performance */
  enableAsyncLogging?: boolean
  /** Whether to enable sampling of log entries */
  enableSampling?: boolean
  /** Sampling rate between 0 and 1 */
  samplingRate?: number
  /** Whether to enable rate limiting for log entries */
  enableRateLimiting?: boolean
  /** Maximum number of log entries per second */
  rateLimit?: number
  /** Whether to collect performance metrics */
  enableMetrics?: boolean
  /** Interval for collecting metrics in milliseconds */
  metricsInterval?: number
  /** Memory usage threshold in bytes */
  memoryThreshold?: number
}

/** OpenTelemetry and observability integration configuration interface. */
export interface ObservabilityConfig {
  /** Whether observability features are enabled */
  enabled?: boolean
  /** HTTP header name for trace ID */
  traceIdHeader?: string
  /** HTTP header name for span ID */
  spanIdHeader?: string
  /** Service name for observability */
  serviceName?: string
  /** Service version for observability */
  serviceVersion?: string
  /** Environment name (development, production, etc.) */
  environment?: string
  /** Whether to enable automatic instrumentation */
  enableAutoInstrumentation?: boolean
  /** Endpoint URL for exporting observability data */
  exportEndpoint?: string
  /** HTTP headers for export requests */
  exportHeaders?: Record<string, string>
}

/** Context management and correlation configuration interface. */
export interface ContextConfig {
  /** Whether to enable automatic correlation ID generation */
  enableAutoCorrelation?: boolean
  /** HTTP header name for correlation ID */
  correlationIdHeader?: string
  /** Length of generated session IDs */
  sessionIdLength?: number
  /** Whether context should be inherited by child loggers */
  enableInheritance?: boolean
  /** Default fields to include in all log entries */
  defaultFields?: Record<string, unknown>
  /** Maximum size of context data in bytes */
  maxContextSize?: number
  /** Whether to validate context data */
  enableContextValidation?: boolean
}

/** Plugin system configuration interface. */
export interface PluginConfig {
  /** Whether the plugin system is enabled */
  enabled?: boolean
  /** Whether to automatically load plugins */
  autoLoad?: boolean
  /** Array of paths to search for plugins */
  pluginPaths?: string[]
  /** Whether plugin hooks are enabled */
  enableHooks?: boolean
  /** Timeout for plugin operations in milliseconds */
  hookTimeout?: number
  /** Maximum number of plugins allowed */
  maxPlugins?: number
}

/** Error boundary and fault tolerance configuration interface. */
export interface ErrorBoundaryConfig {
  /** Whether error boundary is enabled */
  enabled?: boolean
  /** Whether to fallback to console logging on errors */
  fallbackToConsole?: boolean
  /** Whether to suppress errors after handling */
  suppressErrors?: boolean
  /** Maximum number of errors allowed per minute */
  maxErrorsPerMinute?: number
}

/**
 * Main Stoat core configuration interface
 * Defines the comprehensive configuration structure for the Stoat logging system.
 * This interface encompasses all major subsystems including transports, security,
 * performance, observability, context management, plugins, and error boundaries.
 */
export interface StoatCoreConfig {
  /** Minimum log level to process */
  level: LogLevelName
  /** Logger instance name identifier */
  name?: string
  /** Logger version identifier */
  version?: string
  /** Array of transport configurations for output destinations */
  transports: TransportConfig[]
  /** Security and data protection configuration */
  security: SecurityConfig
  /** Performance optimization and monitoring configuration */
  performance: PerformanceConfig
  /** OpenTelemetry and observability integration configuration */
  observability: ObservabilityConfig
  /** Context management and correlation configuration */
  context: ContextConfig
  /** Plugin system configuration */
  plugins: PluginConfig
  /** Error boundary and fault tolerance configuration */
  errorBoundary: ErrorBoundaryConfig
  /** Development environment specific settings */
  development?: Record<string, unknown>
  /** Production environment specific settings */
  production?: Record<string, unknown>
  /** Testing environment specific settings */
  testing?: Record<string, unknown>
}

/**
 * Main Stoat configuration interface - alias for backwards compatibility
 */
export interface StoatConfig {
  /** Minimum log level to process */
  level: LogLevelName
  /** Logger instance name identifier */
  name?: string
  /** Logger version identifier */
  version?: string
  /** Array of transport configurations for output destinations */
  transports: TransportConfig[]
  /** Security and data protection configuration */
  security: SecurityConfig
  /** Performance optimization and monitoring configuration */
  performance: PerformanceConfig
  /** OpenTelemetry and observability integration configuration */
  observability: ObservabilityConfig
  /** Context management and correlation configuration */
  context: ContextConfig
  /** Plugin system configuration */
  plugins: PluginConfig
  /** Error boundary and fault tolerance configuration */
  errorBoundary: ErrorBoundaryConfig
  /** Development environment specific settings */
  development?: Record<string, unknown>
  /** Production environment specific settings */
  production?: Record<string, unknown>
  /** Testing environment specific settings */
  testing?: Record<string, unknown>
}

// Re-export logger-specific config types for unified factory
export type { BasicConfig } from '../loggers/basic-logger.ts'
export type { AsyncConfig } from '../loggers/async-logger.ts'
export type { StructuredConfig } from '../loggers/structured-logger.ts'
export type { HybridConfig } from '../loggers/hybrid-logger.ts'
