/**
 * Environment Variable Utilities for Stoat logging library
 * Handles environment variable mapping and processing
 * @module
 */

/** Environment variable prefix used for all Stoat configuration variables. */
export const STOAT_ENV_PREFIX = 'STOAT_'

/** Mapping of environment variable names to configuration paths. */
export const ENV_VAR_MAPPING: Record<string, string> = {
  [`${STOAT_ENV_PREFIX}LEVEL`]: 'level',
  [`${STOAT_ENV_PREFIX}NAME`]: 'name',
  [`${STOAT_ENV_PREFIX}VERSION`]: 'version',

  [`${STOAT_ENV_PREFIX}SECURITY_ENABLED`]: 'security.enabled',
  [`${STOAT_ENV_PREFIX}SANITIZE_INPUTS`]: 'security.sanitizeInputs',
  [`${STOAT_ENV_PREFIX}MAX_STRING_LENGTH`]: 'security.maxStringLength',

  [`${STOAT_ENV_PREFIX}ASYNC_LOGGING`]: 'performance.enableAsyncLogging',
  [`${STOAT_ENV_PREFIX}SAMPLING_RATE`]: 'performance.samplingRate',
  [`${STOAT_ENV_PREFIX}RATE_LIMIT`]: 'performance.rateLimit',
  [`${STOAT_ENV_PREFIX}MEMORY_THRESHOLD`]: 'performance.memoryThreshold',

  [`${STOAT_ENV_PREFIX}OTEL_ENABLED`]: 'observability.enabled',
  [`${STOAT_ENV_PREFIX}SERVICE_NAME`]: 'observability.serviceName',
  [`${STOAT_ENV_PREFIX}SERVICE_VERSION`]: 'observability.serviceVersion',
  [`${STOAT_ENV_PREFIX}ENVIRONMENT`]: 'observability.environment',
  [`${STOAT_ENV_PREFIX}EXPORT_ENDPOINT`]: 'observability.exportEndpoint',

  [`${STOAT_ENV_PREFIX}AUTO_CORRELATION`]: 'context.enableAutoCorrelation',
  [`${STOAT_ENV_PREFIX}SESSION_ID_LENGTH`]: 'context.sessionIdLength',
  [`${STOAT_ENV_PREFIX}MAX_CONTEXT_SIZE`]: 'context.maxContextSize',

  [`${STOAT_ENV_PREFIX}ERROR_BOUNDARY`]: 'errorBoundary.enabled',
  [`${STOAT_ENV_PREFIX}FALLBACK_CONSOLE`]: 'errorBoundary.fallbackToConsole',
  [`${STOAT_ENV_PREFIX}SUPPRESS_ERRORS`]: 'errorBoundary.suppressErrors',
} as const

/**
 * Normalizes environment variable values to appropriate types.
 * @param value - The string value from environment variable
 * @returns Normalized value as string, number, or boolean
 */
export function normalizeEnvValue(value: string): string | number | boolean {
  // Try to parse as number
  const num = Number(value)
  if (!isNaN(num)) {
    return num
  }

  // Try to parse as boolean
  const lower = value.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false

  // Return as string
  return value
}

/**
 * Get environment variable name for a given configuration path
 */
export function getEnvVarName(configPath: string): string | undefined {
  for (const [envVar, path] of Object.entries(ENV_VAR_MAPPING)) {
    if (path === configPath) {
      return envVar
    }
  }
  return undefined
}
