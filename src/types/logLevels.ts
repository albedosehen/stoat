/**
 * Unified Log Level System for Stoat logging library
 * Combines log level definitions, priorities, and color mappings
 * @module
 */

// Core log levels - string names for validation, numeric values for performance
export const LOG_LEVEL_NAMES = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const

export const LOG_LEVEL_VALUES = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const

export type LogLevelName = typeof LOG_LEVEL_NAMES[number]
export type LogLevelValue = typeof LOG_LEVEL_VALUES[LogLevelName]

/**
 * Log severity colors
 * ANSI escape codes for coloring log messages in the console
 */
export const LOG_SEVERITY_COLORS = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
} as const

export type LogColor = typeof LOG_SEVERITY_COLORS[keyof typeof LOG_SEVERITY_COLORS]

/**
 * Unified log level configuration
 * Maps each log level to its value and color for display
 */
export const LOG_LEVEL_CONFIG = {
  trace: { value: LOG_LEVEL_VALUES.trace, color: LOG_SEVERITY_COLORS.trace },
  debug: { value: LOG_LEVEL_VALUES.debug, color: LOG_SEVERITY_COLORS.debug },
  info: { value: LOG_LEVEL_VALUES.info, color: LOG_SEVERITY_COLORS.info },
  warn: { value: LOG_LEVEL_VALUES.warn, color: LOG_SEVERITY_COLORS.warn },
  error: { value: LOG_LEVEL_VALUES.error, color: LOG_SEVERITY_COLORS.error },
  fatal: { value: LOG_LEVEL_VALUES.fatal, color: LOG_SEVERITY_COLORS.fatal },
} as const satisfies Record<LogLevelName, { value: LogLevelValue; color: string }>

export type LogLevelConfig = typeof LOG_LEVEL_CONFIG[keyof typeof LOG_LEVEL_CONFIG]

/**
 * Display configurations for console output
 */
export const LOG_DISPLAY_CONFIG = {
  colorReset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
} as const

/**
 * Get log level value for comparison
 */
export function getLogLevelValue(level: LogLevelName): LogLevelValue {
  return LOG_LEVEL_VALUES[level]
}

/**
 * Get log level color for display
 */
export function getLogLevelColor(level: LogLevelName): string {
  return LOG_SEVERITY_COLORS[level]
}

/**
 * Check if a log level should be displayed based on minimum level
 */
export function shouldLogLevel(currentLevel: LogLevelName, minimumLevel: LogLevelName): boolean {
  return getLogLevelValue(currentLevel) >= getLogLevelValue(minimumLevel)
}
