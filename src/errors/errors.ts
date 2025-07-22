/**
 * Structured error types for STOAT logger with proper error boundaries
 * Provides comprehensive error handling for modern logging scenarios
 * @module
 */

import type { LogLevel, OperationId, RequestId, TraceId } from '../types/brands.ts'

/**
 * Stoat error context interface
 * Contains metadata about the error, including trace and request IDs
 */
export interface StoatErrorContext {
  readonly traceId?: TraceId
  readonly requestId?: RequestId
  readonly operationId?: OperationId
  readonly timestamp: string
  readonly logLevel?: LogLevel
  readonly component: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Base class for all Stoat errors
 * @param {string} message - Error message
 * @param {string} code - Unique error code
 * @param {string} severity - Error severity level
 * @param {boolean} retryable - Whether the error is retryable
 * @param {StoatErrorContext} context - Contextual information about the error
 * @param {Error} cause - Original error that caused this error (if any)
 */
export class StoatError extends Error {
  public readonly context: StoatErrorContext
  public readonly code: string
  public severity: 'low' | 'medium' | 'high' | 'critical'
  public readonly retryable: boolean
  public override readonly cause?: Error

  constructor({
    message,
    code,
    severity,
    retryable = false,
    context,
    cause,
  }: {
    message: string
    code: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    retryable?: boolean
    context: StoatErrorContext
    cause?: Error
  }) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.severity = severity
    this.retryable = retryable
    this.context = context
    this.cause = cause

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
      cause: this.cause?.message,
    }
  }
}

// Configuration errors
export class ConfigurationError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message,
      code: 'STOAT_CONFIG_ERROR',
      severity: 'high',
      retryable: false,
      context: { ...context, component: 'configuration' },
      cause,
    })
  }
}

export class EnvironmentConfigError extends StoatError {
  constructor(envVar: string, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Invalid environment variable: ${envVar}`,
      code: 'STOAT_ENV_CONFIG_ERROR',
      severity: 'high',
      retryable: false,
      context: { ...context, component: 'configuration' },
      cause,
    })
  }
}

// Validation errors
export class ValidationError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message,
      code: 'STOAT_VALIDATION_ERROR',
      severity: 'medium',
      retryable: false,
      context: { ...context, component: 'validation' },
      cause,
    })
  }
}

export class SchemaValidationError extends StoatError {
  constructor(field: string, value: unknown, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Schema validation failed for field '${field}' with value: ${JSON.stringify(value)}`,
      code: 'STOAT_SCHEMA_VALIDATION_ERROR',
      severity: 'medium',
      retryable: false,
      context: { ...context, component: 'validation' },
      cause,
    })
  }
}

// Security errors
export class SecurityError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message,
      code: 'STOAT_SECURITY_ERROR',
      severity: 'critical',
      retryable: false,
      context: { ...context, component: 'security' },
      cause,
    })
  }
}

export class InputSanitizationError extends StoatError {
  constructor(input: string, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Input sanitization failed for: ${input.slice(0, 50)}...`,
      code: 'STOAT_INPUT_SANITIZATION_ERROR',
      severity: 'critical',
      retryable: false,
      context: { ...context, component: 'security' },
      cause,
    })
  }
}

export class DataRedactionError extends StoatError {
  constructor(path: string, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Data redaction failed for path: ${path}`,
      code: 'STOAT_DATA_REDACTION_ERROR',
      severity: 'critical',
      retryable: false,
      context: { ...context, component: 'security' },
      cause,
    })
  }
}

// Transport errors
export class TransportError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message,
      code: 'STOAT_TRANSPORT_ERROR',
      severity: 'medium',
      retryable: true,
      context: { ...context, component: 'transport' },
      cause,
    })
  }
}

export class FileTransportError extends StoatError {
  constructor(filepath: string, operation: string, context: StoatErrorContext, cause?: Error) {
    super({
      message: `File transport ${operation} failed for: ${filepath}`,
      code: 'STOAT_FILE_TRANSPORT_ERROR',
      severity: 'medium',
      retryable: true,
      context: { ...context, component: 'transport' },
      cause,
    })
  }
}

export class AsyncTransportError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Async transport error: ${message}`,
      code: 'STOAT_ASYNC_TRANSPORT_ERROR',
      severity: 'medium',
      retryable: true,
      context: { ...context, component: 'transport' },
      cause,
    })
  }
}

// Serialization errors
export class SerializationError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message,
      code: 'STOAT_SERIALIZATION_ERROR',
      severity: 'medium',
      retryable: false,
      context: { ...context, component: 'serialization' },
      cause,
    })
  }
}

export class CircularReferenceError extends StoatError {
  constructor(context: StoatErrorContext, cause?: Error) {
    super({
      message: 'Circular reference detected during serialization',
      code: 'STOAT_CIRCULAR_REFERENCE_ERROR',
      severity: 'medium',
      retryable: false,
      context: { ...context, component: 'serialization' },
      cause,
    })
  }
}

// Performance errors
export class PerformanceError extends StoatError {
  constructor(message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message,
      code: 'STOAT_PERFORMANCE_ERROR',
      severity: 'low',
      retryable: true,
      context: { ...context, component: 'performance' },
      cause,
    })
  }
}

export class BufferOverflowError extends StoatError {
  constructor(bufferSize: number, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Buffer overflow detected, size: ${bufferSize}`,
      code: 'STOAT_BUFFER_OVERFLOW_ERROR',
      severity: 'high',
      retryable: true,
      context: { ...context, component: 'performance' },
      cause,
    })
  }
}

export class RateLimitExceededError extends StoatError {
  constructor(limit: number, actual: number, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Rate limit exceeded: ${actual}/${limit}`,
      code: 'STOAT_RATE_LIMIT_EXCEEDED_ERROR',
      severity: 'low',
      retryable: true,
      context: { ...context, component: 'performance' },
      cause,
    })
  }
}

// Plugin errors
export class PluginError extends StoatError {
  constructor(pluginName: string, message: string, context: StoatErrorContext, cause?: Error) {
    super({
      message: `Plugin '${pluginName}': ${message}`,
      code: 'STOAT_PLUGIN_ERROR',
      severity: 'medium',
      retryable: false,
      context: { ...context, component: 'plugin', metadata: { ...context.metadata, pluginName } },
      cause,
    })
  }
}

// Error boundary handler type
export type ErrorBoundaryHandler = (error: StoatError) => void | Promise<void>

// Error boundary configuration
export interface ErrorBoundaryConfig {
  onError?: ErrorBoundaryHandler
  onSecurityError?: ErrorBoundaryHandler
  onCriticalError?: ErrorBoundaryHandler
  fallbackToConsole?: boolean
  suppressErrors?: boolean
}

// Error boundary implementation
export class ErrorBoundary {
  private config: ErrorBoundaryConfig

  constructor(config: ErrorBoundaryConfig = {}) {
    this.config = {
      fallbackToConsole: true,
      suppressErrors: false,
      ...config,
    }
  }

  async handle(error: unknown, context: Partial<StoatErrorContext> = {}): Promise<void> {
    try {
      const stoatError = this.normalizeError(error, context)

      // Call appropriate handlers
      if (stoatError.severity === 'critical' && this.config.onCriticalError) {
        await this.config.onCriticalError(stoatError)
      } else if (stoatError instanceof SecurityError && this.config.onSecurityError) {
        await this.config.onSecurityError(stoatError)
      } else if (this.config.onError) {
        await this.config.onError(stoatError)
      }

      // Fallback to console if configured
      if (this.config.fallbackToConsole) {
        console.error('[STOAT Error Boundary]', stoatError.toJSON())
      }

      // Re-throw if not suppressed
      if (!this.config.suppressErrors) {
        throw stoatError
      }
    } catch (boundaryError) {
      // Prevent error boundary from crashing
      if (this.config.fallbackToConsole) {
        console.error('[STOAT Error Boundary - CRITICAL]', {
          originalError: error,
          boundaryError,
          context,
        })
      }

      if (!this.config.suppressErrors) {
        throw boundaryError
      }
    }
  }

  private normalizeError(error: unknown, context: Partial<StoatErrorContext>): StoatError {
    const fullContext: StoatErrorContext = {
      timestamp: new Date().toISOString(),
      component: 'unknown',
      ...context,
    }

    if (error instanceof StoatError) {
      return error
    }

    if (error instanceof Error) {
      return new StoatError({
        message: error.message,
        code: 'STOAT_UNKNOWN_ERROR',
        severity: 'medium',
        retryable: false,
        context: fullContext,
        cause: error,
      })
    }

    return new StoatError({
      message: `Unknown error: ${String(error)}`,
      code: 'STOAT_UNKNOWN_ERROR',
      severity: 'low',
      retryable: false,
      context: fullContext,
    })
  }
}

// Utility function to create error context
export function createErrorContext({
  traceId,
  requestId,
  operationId,
  logLevel,
  component,
  metadata,
}: Partial<StoatErrorContext> & { component: string }): StoatErrorContext {
  return {
    traceId,
    requestId,
    operationId,
    timestamp: new Date().toISOString(),
    logLevel,
    component,
    metadata,
  }
}
