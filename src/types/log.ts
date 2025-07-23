/**
 * Stoat constants and types for logs
 * This module defines various enumerations used in the Stoat system.
 * @module
 */

/**
 * Log levels for Stoat
 * These levels define the severity of log messages.
 *
 * @property {string} Trace - Detailed information, typically for debugging.
 * @property {string} Debug - Debugging information, less detailed than Trace.
 * @property {string} Info - General information about application progress.
 * @property {string} Warn - Potentially harmful situations that require attention.
 * @property {string} Error - Error events that might still allow the application to continue running
 * @property {string} Fatal - Severe errors that lead to application termination.
 */
export const LOG_LEVEL = {
  Trace: 'trace',
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
  Fatal: 'fatal',
} as const

/**
 * Log level type
 */
export type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL]

/**
 * Log level priorities
 * This object defines the priority of each log level, where lower numbers indicate higher priority.
 *
 * @property {number} Trace - Priority 0
 * @property {number} Debug - Priority 1
 * @property {number} Info - Priority 2
 * @property {number} Warn - Priority 3
 * @property {number} Error - Priority 4
 * @property {number} Fatal - Priority 5
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LOG_LEVEL.Trace]: 0,
  [LOG_LEVEL.Debug]: 1,
  [LOG_LEVEL.Info]: 2,
  [LOG_LEVEL.Warn]: 3,
  [LOG_LEVEL.Error]: 4,
  [LOG_LEVEL.Fatal]: 5,
} as const

/**
 * Log level priority type
 */
export type LogLevelPriority = typeof LOG_LEVEL_PRIORITY[keyof typeof LOG_LEVEL_PRIORITY]

/**
 * Log severity colors
 * This object defines ANSI escape codes for coloring log messages in the console.
 *
 * @property {string} Trace - Gray color for Trace logs
 * @property {string} Debug - Cyan color for Debug logs
 * @property {string} Info - Green color for Info logs
 * @property {string} Warn - Yellow color for Warn logs
 * @property {string} Error - Red color for Error logs
 * @property {string} Fatal - Magenta color for Fatal logs
 */
export const LOG_SEVERITY_COLORS = {
  Trace: '\x1b[90m',
  Debug: '\x1b[36m',
  Info: '\x1b[32m',
  Warn: '\x1b[33m',
  Error: '\x1b[31m',
  Fatal: '\x1b[35m',
} as const

/**
 * Log color type
 * This type represents the possible colors for log messages.
 */
export type LogColor = typeof LOG_SEVERITY_COLORS[keyof typeof LOG_SEVERITY_COLORS]

/**
 * Log level configuration
 * This object maps each log level to its corresponding value and color.
 */
export const LOG_LEVEL_CONFIG: Record<LogLevel, { value: number; color: LogColor }> = {
  [LOG_LEVEL.Trace]: { value: 0, color: LOG_SEVERITY_COLORS.Trace },
  [LOG_LEVEL.Debug]: { value: 1, color: LOG_SEVERITY_COLORS.Debug },
  [LOG_LEVEL.Info]: { value: 2, color: LOG_SEVERITY_COLORS.Info },
  [LOG_LEVEL.Warn]: { value: 3, color: LOG_SEVERITY_COLORS.Warn },
  [LOG_LEVEL.Error]: { value: 4, color: LOG_SEVERITY_COLORS.Error },
  [LOG_LEVEL.Fatal]: { value: 5, color: LOG_SEVERITY_COLORS.Fatal },
} as const satisfies Record<LogLevel, { value: number; color: string }>

/**
 * Log level configuration type
 */
export type LogLevelConfig = typeof LOG_LEVEL_CONFIG[keyof typeof LOG_LEVEL_CONFIG]
