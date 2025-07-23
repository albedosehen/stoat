/**
 * Configuration Interfaces for Stoat logging library
 * Defines all configuration types and the main StoatConfig interface
 * @module
 */

import type { LogLevelName } from './logLevels.ts'
import type { TransportConfig } from './transports.ts'

// Security and redaction configuration
export interface SecurityConfig {
  enabled?: boolean
  sanitizeInputs?: boolean
  redactPaths?: string[]
  redactPatterns?: string[]
  maxStringLength?: number
  allowCircularRefs?: boolean
}

// Performance and optimization configuration
export interface PerformanceConfig {
  enableAsyncLogging?: boolean
  enableSampling?: boolean
  samplingRate?: number
  enableRateLimiting?: boolean
  rateLimit?: number
  enableMetrics?: boolean
  metricsInterval?: number
  memoryThreshold?: number
}

// OpenTelemetry integration configuration
export interface ObservabilityConfig {
  enabled?: boolean
  traceIdHeader?: string
  spanIdHeader?: string
  serviceName?: string
  serviceVersion?: string
  environment?: string
  enableAutoInstrumentation?: boolean
  exportEndpoint?: string
  exportHeaders?: Record<string, string>
}

// Context configuration for trading and correlation
export interface ContextConfig {
  enableAutoCorrelation?: boolean
  correlationIdHeader?: string
  sessionIdLength?: number
  enableInheritance?: boolean
  defaultFields?: Record<string, unknown>
  maxContextSize?: number
  enableContextValidation?: boolean
}

// Plugin configuration interface
export interface PluginConfig {
  enabled?: boolean
  autoLoad?: boolean
  pluginPaths?: string[]
  enableHooks?: boolean
  hookTimeout?: number
  maxPlugins?: number
}

// Error boundary configuration
export interface ErrorBoundaryConfig {
  enabled?: boolean
  fallbackToConsole?: boolean
  suppressErrors?: boolean
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
  level: LogLevelName
  name?: string
  version?: string
  transports: TransportConfig[]
  security: SecurityConfig
  performance: PerformanceConfig
  observability: ObservabilityConfig
  context: ContextConfig
  plugins: PluginConfig
  errorBoundary: ErrorBoundaryConfig
  development?: Record<string, unknown>
  production?: Record<string, unknown>
  testing?: Record<string, unknown>
}

// Re-export logger-specific config types for unified factory
export type { BasicConfig } from '../loggers/basic-logger.ts'
export type { AsyncConfig } from '../loggers/async-logger.ts'
export type { StructuredConfig } from '../loggers/structured-logger.ts'
export type { HybridConfig } from '../loggers/hybrid-logger.ts'
