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

// Main Stoat configuration interface
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
