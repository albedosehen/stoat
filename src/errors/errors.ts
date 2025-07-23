/**
 * Structured error types for Stoatlogger with proper error boundaries
 * Provides comprehensive error handling for modern logging scenarios
 * @module
 */

import type { LogLevel, OperationId, RequestId, TraceId } from '../types/brands.ts'

/**
 * Stoat error context interface
 * Contains metadata about the error, including trace and request IDs
 */
export interface StoatErrorContext {
  /** Distributed tracing ID for request correlation */
  readonly traceId?: TraceId
  /** Request correlation ID for tracking individual requests */
  readonly requestId?: RequestId
  /** Operation identifier for tracking specific operations */
  readonly operationId?: OperationId
  /** ISO timestamp when the error occurred */
  readonly timestamp: string
  /** Log level associated with the error */
  readonly logLevel?: LogLevel
  /** Component or module where the error occurred */
  readonly component: string
  /** Additional metadata about the error context */
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
  /** Contextual information about the error including trace and request IDs */
  public readonly context: StoatErrorContext
  /** Unique error code identifying the type of error */
  public readonly code: string
  /** Severity level of the error indicating its impact */
  public severity: 'low' | 'medium' | 'high' | 'critical'
  /** Whether the error condition can be retried */
  public readonly retryable: boolean
  /** Original error that caused this error, if any */
  public override readonly cause?: Error

  /**
   * Creates a new StoatError.
   * @param {Object} param0 - Error initialization parameters
   */
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

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Converts the error to a JSON representation.
   * @returns JSON object containing error details
   */
  toJSON(): {
    name: string
    message: string
    code: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    retryable: boolean
    context: StoatErrorContext
    stack?: string
    cause?: string
  } {
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

/**
 * Error thrown when there are issues with Stoat configuration.
 * @class ConfigurationError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When configuration issues occur
 */
export class ConfigurationError extends StoatError {
  /**
   * Creates a new ConfigurationError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when environment variable configuration is invalid.
 *
 * @class EnvironmentConfigError
 * @param envVar The name of the environment variable that caused the error
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When environment variable configuration is invalid
 */
export class EnvironmentConfigError extends StoatError {
  /**
   * Creates a new EnvironmentConfigError.
   * @param envVar The name of the environment variable that caused the error
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when validation of input data fails.
 * @class ValidationError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When validation fails
 */
export class ValidationError extends StoatError {
  /**
   * Creates a new ValidationError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when schema validation fails for a specific field.
 * @class SchemaValidationError
 * @param field The name of the field that failed validation
 * @param value The value that failed validation
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When schema validation fails
 */
export class SchemaValidationError extends StoatError {
  /**
   * Creates a new SchemaValidationError.
   * @param field The name of the field that failed validation
   * @param value The value that failed validation
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when security-related operations fail.
 * @class SecurityError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When security-related operations fail
 */
export class SecurityError extends StoatError {
  /**
   * Creates a new SecurityError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when input sanitization fails during processing.
 * @class InputSanitizationError
 * @param input The input that failed sanitization
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When input sanitization fails
 */
export class InputSanitizationError extends StoatError {
  /**
   * Creates a new InputSanitizationError.
   * @param input The input that failed sanitization
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when data redaction fails for sensitive information.
 * @class DataRedactionError
 * @param path The path of the data that failed redaction
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When data redaction fails
 */
export class DataRedactionError extends StoatError {
  /**
   * Creates a new DataRedactionError.
   * @param path The path of the data that failed redaction
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when transport operations fail.
 * @class TransportError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When transport operations fail
 */
export class TransportError extends StoatError {
  /**
   * Creates a new TransportError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when file transport operations fail.
 * @class FileTransportError
 * @param filepath The path of the file involved in the transport operation
 * @param operation The type of operation that failed (e.g., "upload", "download")
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When file transport operations fail
 */
export class FileTransportError extends StoatError {
  /**
   * Creates a new FileTransportError.
   * @param filepath The path of the file involved in the transport operation
   * @param operation The type of operation that failed (e.g., "upload", "download")
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when async transport operations fail.
 * @class AsyncTransportError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When async transport operations fail
 */
export class AsyncTransportError extends StoatError {
  /**
   * Creates a new AsyncTransportError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when serialization operations fail.
 * @class SerializationError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When serialization operations fail
 */
export class SerializationError extends StoatError {
  /**
   * Creates a new SerializationError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when circular references are detected during serialization.
 * @class CircularReferenceError
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When circular references are detected during serialization
 */
export class CircularReferenceError extends StoatError {
  /**
   * Creates a new CircularReferenceError.
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when performance thresholds are exceeded or performance issues occur.
 * @class PerformanceError
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When performance thresholds are exceeded or performance issues occur
 */
export class PerformanceError extends StoatError {
  /**
   * Creates a new PerformanceError.
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when buffer overflow is detected.
 * @class BufferOverflowError
 * @param bufferSize The size of the buffer
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When buffer overflow is detected
 */
export class BufferOverflowError extends StoatError {
  /**
   * Creates a new BufferOverflowError.
   * @param bufferSize The size of the buffer that caused the overflow
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when rate limiting thresholds are exceeded.
 * @class RateLimitExceededError
 * @param limit The rate limit
 * @param actual The actual usage
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When rate limiting thresholds are exceeded
 */
export class RateLimitExceededError extends StoatError {
  /**
   * Creates a new RateLimitExceededError.
   * @param limit The rate limit
   * @param actual The actual usage
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/**
 * Error thrown when plugin operations fail.
 * @class PluginError
 * @param pluginName The name of the plugin
 * @param message The error message
 * @param context Error context information
 * @param cause Optional underlying cause
 * @throws {StoatError} When plugin operations fail
 */
export class PluginError extends StoatError {
  /**
   * Creates a new PluginError.
   * @param pluginName The name of the plugin that encountered the error
   * @param message The error message
   * @param context Error context information
   * @param cause Optional underlying cause
   */
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

/** Function type for handling errors in the error boundary system. */
export type ErrorBoundaryHandler = (error: StoatError) => void | Promise<void>

/** Configuration interface for error boundary behavior and handlers. */
export interface ErrorBoundarySetting {
  /** Handler for general errors */
  onError?: ErrorBoundaryHandler
  /** Handler specifically for security-related errors */
  onSecurityError?: ErrorBoundaryHandler
  /** Handler specifically for critical errors */
  onCriticalError?: ErrorBoundaryHandler
  /** Whether to fallback to console logging when handlers fail */
  fallbackToConsole?: boolean
  /** Whether to suppress errors after handling */
  suppressErrors?: boolean
}

/**
 * Error boundary implementation for handling and managing Stoat errors.
 * @class ErrorBoundary
 * @param config Configuration settings for the error boundary
 * @throws {StoatError} When errors occur during handling
 */
export class ErrorBoundary {
  private setting: ErrorBoundarySetting

  /**
   * Creates a new ErrorBoundary instance.
   * @param config Configuration settings for the error boundary
   */
  constructor(config: ErrorBoundarySetting = {}) {
    this.setting = {
      fallbackToConsole: true,
      suppressErrors: false,
      ...config,
    }
  }

  /**
   * Handles errors using the configured error boundary settings.
   * @param error The error to handle
   * @param context Additional context for the error
   */
  async handle(error: unknown, context: Partial<StoatErrorContext> = {}): Promise<void> {
    try {
      const stoatError = this.normalizeError(error, context)

      // Call appropriate handlers
      if (stoatError.severity === 'critical' && this.setting.onCriticalError) {
        await this.setting.onCriticalError(stoatError)
      } else if (stoatError instanceof SecurityError && this.setting.onSecurityError) {
        await this.setting.onSecurityError(stoatError)
      } else if (this.setting.onError) {
        await this.setting.onError(stoatError)
      }

      // Fallback to console if configured
      if (this.setting.fallbackToConsole) {
        console.error('[StoatError Boundary]', stoatError.toJSON())
      }

      // Re-throw if not suppressed
      if (!this.setting.suppressErrors) {
        throw stoatError
      }
    } catch (boundaryError) {
      // Prevent error boundary from crashing
      if (this.setting.fallbackToConsole) {
        console.error('[StoatError Boundary - CRITICAL]', {
          originalError: error,
          boundaryError,
          context,
        })
      }

      if (!this.setting.suppressErrors) {
        throw boundaryError
      }
    }
  }

  /**
   * Normalizes an error into a StoatError instance.
   * @param error The error to normalize
   * @param context Additional context for the error
   * @returns A normalized StoatError instance
   */
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

/**
 * Utility function to create error context
 * @param params The parameters for creating the error context
 * @returns The created error context
 * @throws {Error} If required parameters are missing
 */
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
