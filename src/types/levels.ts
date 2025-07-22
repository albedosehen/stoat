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
