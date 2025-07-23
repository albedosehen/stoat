/**
 * Unified Log Level System for Stoat logging library
 * Combines log level definitions, priorities, and color mappings
 * @module
 */

/**
 * Level type definitions and interfaces for Stoat logging library
 * Contains only type definitions, interfaces, and enums - no implementations
 * @module
 */

/**
 * Custom log level definition
 *
 * This structure defines a custom log level with a name, value, description,
 * color, enabled state, and optional aliases.
 * It allows for flexible logging configurations, enabling users to define
 * their own log levels beyond the standard ones.
 */
export interface CustomLogLevel {
  /** The name of the custom log level */
  readonly name: string

  /** The numeric value of the log level, used for comparison */
  readonly value: number

  /** Optional description for the log level */
  readonly description?: string

  /** Optional color for display purposes */
  readonly color?: string

  /** Whether the level is enabled */
  readonly enabled: boolean

  /** Optional list of aliases for the log level */
  readonly aliases?: string[]
}

/**
 * Level filter configuration
 *
 * This structure allows filtering log levels based on various criteria,
 * including minimum and maximum levels, whitelists, blacklists, component-specific filters,
 * and time-based filters.
 * It provides a flexible way to control which log levels are included in the output,
 * allowing for fine-grained control over logging behavior.
 */
export interface LevelFilter {
  /** Minimum level to include in logs */
  readonly minLevel?: string

  /** Maximum level to include in logs */
  readonly maxLevel?: string

  /** List of levels that are allowed (whitelist) */
  readonly allowedLevels?: string[]

  /** List of levels that are blocked (blacklist) */
  readonly blockedLevels?: string[]

  /** Component-specific filters, mapping component names to allowed levels */
  readonly componentFilters?: Record<string, string[]>

  /** Time-based filters for levels, allowing levels only during specified times */
  readonly timeBasedFilters?: TimeBasedFilter[]
}

/**
 * Time-based level filtering
 *
 * This structure allows filtering log levels based on specific time ranges.
 * It can be used to enable or disable certain levels during specific times of the day.
 */
export interface TimeBasedFilter {
  /** Start time for the filter (HH:MM format) */
  readonly startTime: string

  /** End time for the filter (HH:MM format) */
  readonly endTime: string

  /** List of levels to include during the specified time */
  readonly levels: string[]

  /** Whether the filter is enabled */
  readonly enabled: boolean
}

/**
 * Level Hierarchy structure
 *
 * This structure maintains the relationships between log levels, their aliases, and numeric values.
 * It provides a way to efficiently look up levels by name or value, and to sort levels
 * based on their numeric values.
 */
export interface LevelHierarchy {
  /** Map of level names to their numeric values */
  readonly levels: Map<string, number>

  /** Map of aliases to their canonical level names */
  readonly aliases: Map<string, string>

  /** Reverse lookup map from numeric values to level names */
  readonly reverseLookup: Map<number, string>

  /** Sorted list of level names based on their values */
  readonly sortedLevels: string[]
}

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
export const LOG_LEVEL_CONFIG: Record<LogLevelName, { value: LogLevelValue; color: string }> = {
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
