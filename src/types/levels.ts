/**
 * Structured log levels with custom level support and filtering capabilities
 * Provides dynamic level management and filtering for enterprise logging scenarios
 * Supports time-based filtering, component-specific levels, and custom level definitions
 * @module
 */

import type { LogLevelName } from './schema.ts'
import { LOG_LEVEL_NAMES, LOG_LEVEL_VALUES } from './schema.ts'
import { createErrorContext, ValidationError } from '../errors/errors.ts'

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

/**
 * Log Level Manager
 *
 * This class manages custom log levels, allowing for dynamic addition, removal,
 * and filtering of log levels.
 *
 * @class
 * @param {CustomLogLevel[]} [customLevels=[]] - Initial custom log levels to add
 * @throws {ValidationError} If a level with the same name or value already exists
 *
 * @example
 * // Add a custom log level
 * const levelManager = new LogLevelManager([
 *  {
 *    name: 'debug',
 *    value: 100,
 *    description: 'Debug level',
 *    color: 'blue',
 *    enabled: true,
 *    aliases: ['dbg'] },
 * ]);
 */
export class LogLevelManager {
  private hierarchy: LevelHierarchy
  private customLevels = new Map<string, CustomLogLevel>()
  private filters: LevelFilter = {}
  private dynamicLevels = new Map<string, number>() // For runtime level changes

  constructor(customLevels: CustomLogLevel[] = []) {
    this.hierarchy = this.buildHierarchy([])
    this.initializeStandardLevels()
    this.addCustomLevels(customLevels)
  }

  /**
   * Initialize standard log levels
   *
   * @private
   * @returns {void}
   */
  private initializeStandardLevels(): void {
    for (const [name, value] of Object.entries(LOG_LEVEL_VALUES)) {
      this.customLevels.set(name, {
        name,
        value,
        description: `Standard ${name} level`,
        enabled: true,
        aliases: [],
      })
    }
    this.rebuildHierarchy()
  }

  /**
   * Adds a custom log level
   *
   * @param {CustomLogLevel} level - The custom log level to add
   * @throws {ValidationError} If the level name or value is invalid, or if
   * a level with the same name or value already exists.
   * @returns {void}
   *
   * @example
   *
   * // Add a custom log level
   * levelManager.addLevel({
   *  name: 'verbose',
   *  value: 200,
   *  description: 'Verbose level',
   *  color: 'purple',
   *  enabled: true,
   *  aliases: ['v'] },
   * );
   */
  addLevel(level: CustomLogLevel): void {
    // Validate level
    this.validateLevel(level)

    // Check for conflicts
    if (this.hierarchy.levels.has(level.name)) {
      throw new ValidationError(
        `Level '${level.name}' already exists`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    // Check value conflicts
    if (this.hierarchy.reverseLookup.has(level.value)) {
      const existingLevel = this.hierarchy.reverseLookup.get(level.value)
      throw new ValidationError(
        `Level value ${level.value} already used by '${existingLevel}'`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    this.customLevels.set(level.name, level)
    this.rebuildHierarchy()
  }

  /**
   * Adds multiple custom log levels
   *
   * @param {CustomLogLevel[]} levels - Array of custom log levels to add
   * @throws {ValidationError} If any level in the array is invalid or conflicts with
   * existing levels.
   * @returns {void}
   *
   * @example
   *
   * // Add multiple custom log levels
   * levelManager.addCustomLevels([
   * {
   *   name: 'trace',
   *   value: 50,
   *   description: 'Trace level',
   *   color: 'cyan',
   *   enabled: true,
   *   aliases: ['tr']
   *  },
   *  {
   *   name: 'critical',
   *   value: 500,
   *   description: 'Critical level',
   *   color: 'red',
   *   enabled: true,
   *   aliases: ['crit']
   *  },
   * ]);
   */
  addCustomLevels(levels: CustomLogLevel[]): void {
    for (const level of levels) {
      this.addLevel(level)
    }
  }

  /**
   * Removes a custom log level by name
   *
   * @param {string} name - The name of the custom log level to remove
   * @throws {ValidationError} If trying to remove a standard level.
   * @returns {boolean} - Returns true if the level was removed, false if it
   * did not exist.
   *
   * @example
   *
   * // Remove a custom log level
   * levelManager.removeLevel('verbose');
   */
  removeLevel(name: string): boolean {
    // Prevent removal of standard levels
    if (LOG_LEVEL_NAMES.includes(name as LogLevelName)) {
      throw new ValidationError(
        `Cannot remove standard level '${name}'`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    const removed = this.customLevels.delete(name)
    if (removed) {
      this.rebuildHierarchy()
    }
    return removed
  }

  /**
   * Returns the value of a log level by its name.
   *
   * @param {string} name - The name of the log level
   * @returns {number | undefined} - The numeric value of the log level, or
   * undefined if the level does not exist.
   */
  getLevelValue(name: string): number | undefined {
    if (this.dynamicLevels.has(name)) {
      return this.dynamicLevels.get(name)
    }

    const realName = this.hierarchy.aliases.get(name) || name
    return this.hierarchy.levels.get(realName)
  }

  /**
   * Returns the name of a log level by its value.
   *
   * @param {number} value - The numeric value of the log level
   * @returns {string | undefined} - The name of the log level, or undefined
   * if the level does not exist.
   */
  getLevelName(value: number): string | undefined {
    return this.hierarchy.reverseLookup.get(value)
  }

  /**
   * Whether a level exists by name
   *
   * @param {string} name - The name of the log level to check
   * @returns {boolean} - True if the level exists, false otherwise.
   */
  hasLevel(name: string): boolean {
    const realName = this.hierarchy.aliases.get(name) || name
    return this.hierarchy.levels.has(realName)
  }

  /**
   * Get all custom levels
   *
   * Returns a sorted array of all enabled custom log levels.
   * @returns {CustomLogLevel[]} - Array of custom log levels
   */
  getAllLevels(): CustomLogLevel[] {
    return Array.from(this.customLevels.values())
      .filter((level) => level.enabled)
      .sort((a, b) => a.value - b.value)
  }

  /**
   * Get sorted level names
   *
   * @returns {string[]} - Array of level names sorted by their values
   */
  getSortedLevelNames(): string[] {
    return this.hierarchy.sortedLevels
  }

  /**
   * Compare two levels
   */
  compareLevels(level1: string, level2: string): number {
    const value1 = this.getLevelValue(level1)
    const value2 = this.getLevelValue(level2)

    if (value1 === undefined || value2 === undefined) {
      throw new ValidationError(
        `Invalid level for comparison: ${level1} or ${level2}`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    return value1 - value2
  }

  /**
   * Check if level meets minimum level requirement
   *
   * @param {string} level - The log level to check
   * @param {string} minLevel - The minimum level to compare against
   * @returns {boolean} - True if the level is greater than or equal to the minimum level,
   * false otherwise.
   */
  meetsMinLevel(level: string, minLevel: string): boolean {
    return this.compareLevels(level, minLevel) >= 0
  }

  /**
   * Check if a level is enabled
   *
   * @param {string} level - The name of the log level to check
   * @returns {boolean} - True if the level is enabled, false otherwise.
   */
  isLevelEnabled(level: string): boolean {
    const realName = this.hierarchy.aliases.get(level) || level
    const customLevel = this.customLevels.get(realName)
    return customLevel?.enabled ?? false
  }

  /**
   * Sets a custom log level as enabled or disabled
   *
   * @param {string} name - The name of the log level to enable/disable
   * @param {boolean} enabled - True to enable the level, false to disable it
   * @throws {ValidationError} If the level does not exist.
   * @returns {void}
   */
  setLevelEnabled(name: string, enabled: boolean): void {
    const realName = this.hierarchy.aliases.get(name) || name
    const level = this.customLevels.get(realName)

    if (!level) {
      throw new ValidationError(
        `Level '${name}' not found`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    this.customLevels.set(realName, { ...level, enabled })
  }

  /**
   * Sets a dynamic log level override
   *
   * @param {string} name - The name of the dynamic log level
   * @param {number} value - The numeric value to set for the dynamic level
   * @throws {ValidationError} If the level name is invalid or conflicts with existing levels
   * @returns {void}
   */
  setDynamicLevel(name: string, value: number): void {
    this.dynamicLevels.set(name, value)
  }

  /**
   * Removes a dynamic log level override
   *
   * @param {string} name - The name of the dynamic log level to remove
   * @returns {boolean} - Returns true if the dynamic level was removed, false if
   * it did not exist.
   */
  clearDynamicLevel(name: string): boolean {
    return this.dynamicLevels.delete(name)
  }

  /**
   * Sets the level filters
   *
   * @param {LevelFilter} filters - The level filters to set
   * @throws {ValidationError} If the filters are invalid or reference non-existent levels.
   * @returns {void}
   */
  setFilters(filters: LevelFilter): void {
    this.validateFilters(filters)
    this.filters = { ...filters }
  }

  /**
   * Updates the level filters
   *
   * @param {Partial<LevelFilter>} filters - Partial filters to update
   * @throws {ValidationError} If the updated filters are invalid or reference non-existent levels
   * @returns {void}
   */
  updateFilters(filters: Partial<LevelFilter>): void {
    const newFilters = { ...this.filters, ...filters }
    this.validateFilters(newFilters)
    this.filters = newFilters
  }

  /**
   * Checks if a level passes the current filters
   *
   * @param {string} level - The log level to check
   * @param {string} [component] - Optional component name for component-specific filters
   * @returns {boolean} - True if the level passes all filters, false otherwise.
   */
  passesFilters(level: string, component?: string): boolean {
    const filters = this.filters

    if (!this.isLevelEnabled(level)) {
      return false
    }

    if (filters.blockedLevels?.includes(level)) {
      return false
    }

    if (filters.allowedLevels && !filters.allowedLevels.includes(level)) {
      return false
    }

    if (filters.minLevel && !this.meetsMinLevel(level, filters.minLevel)) {
      return false
    }

    if (filters.maxLevel && this.compareLevels(level, filters.maxLevel) > 0) {
      return false
    }

    if (component && filters.componentFilters?.[component]) {
      const componentLevels = filters.componentFilters[component]
      if (!componentLevels.includes(level)) {
        return false
      }
    }

    if (filters.timeBasedFilters) {
      return this.passesTimeBasedFilters(level, filters.timeBasedFilters)
    }

    return true
  }

  /**
   * Checks if a level passes the current time-based filters
   *
   * @private
   * @param {string} level - The log level to check
   * @param {TimeBasedFilter[]} timeFilters - Array of time-based filters to apply
   * @returns {boolean} - True if the level passes the time-based filters, false otherwise.
   */
  private passesTimeBasedFilters(level: string, timeFilters: TimeBasedFilter[]): boolean {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    for (const filter of timeFilters) {
      if (!filter.enabled) continue

      if (this.isTimeInRange(currentTime, filter.startTime, filter.endTime)) {
        return filter.levels.includes(level)
      }
    }

    return true // If no time filters match, allow by default
  }

  /**
   * Checks if current time is in range
   *
   * @private
   * @param {string} current - Current time in HH:MM format
   * @param {string} start - Start time in HH:MM format
   * @param {string} end - End time in HH:MM format
   * @returns {boolean} - True if current time is within the range, false otherwise
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    const currentMinutes = this.timeToMinutes(current)
    const startMinutes = this.timeToMinutes(start)
    const endMinutes = this.timeToMinutes(end)

    if (startMinutes <= endMinutes) {
      // Same day range
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    } else {
      // Overnight range
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    }
  }

  /**
   * Convert time string to minutes
   *
   * @private
   * @param {string} time - Time in HH:MM format
   * @returns {number} - Total minutes from midnight
   * @throws {ValidationError} If the time format is invalid
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Get current filters
   *
   * @returns {LevelFilter} - The current level filters.
   */
  getFilters(): LevelFilter {
    return { ...this.filters }
  }

  /**
   * Clear all filters
   *
   * @returns {void}
   */
  clearFilters(): void {
    this.filters = {}
  }

  /**
   * Validate level definition
   *
   * @private
   * @param {CustomLogLevel} level - The custom log level to validate
   * @throws {ValidationError} If the level name or value is invalid, or if
   * a level with the same name or value already exists.
   * @returns {void}
   */
  private validateLevel(level: CustomLogLevel): void {
    if (!level.name || typeof level.name !== 'string') {
      throw new ValidationError(
        'Level name must be a non-empty string',
        createErrorContext({ component: 'level-manager' }),
      )
    }

    if (typeof level.value !== 'number' || level.value < 0) {
      throw new ValidationError(
        'Level value must be a non-negative number',
        createErrorContext({ component: 'level-manager' }),
      )
    }

    // Validate aliases
    if (level.aliases) {
      for (const alias of level.aliases) {
        if (typeof alias !== 'string' || !alias) {
          throw new ValidationError(
            'Level aliases must be non-empty strings',
            createErrorContext({ component: 'level-manager' }),
          )
        }
      }
    }
  }

  /**
   * Validate filter configuration
   *
   * @private
   * @param {LevelFilter} filters - The level filters to validate
   * @throws {ValidationError} If the filters are invalid or reference non-existent levels.
   * @returns {void}
   */
  private validateFilters(filters: LevelFilter): void {
    if (filters.minLevel && !this.hasLevel(filters.minLevel)) {
      throw new ValidationError(
        `Minimum level '${filters.minLevel}' does not exist`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    if (filters.maxLevel && !this.hasLevel(filters.maxLevel)) {
      throw new ValidationError(
        `Maximum level '${filters.maxLevel}' does not exist`,
        createErrorContext({ component: 'level-manager' }),
      )
    }

    if (filters.minLevel && filters.maxLevel) {
      if (this.compareLevels(filters.minLevel, filters.maxLevel) > 0) {
        throw new ValidationError(
          `Minimum level cannot be higher than maximum level`,
          createErrorContext({ component: 'level-manager' }),
        )
      }
    }

    if (filters.allowedLevels) {
      for (const level of filters.allowedLevels) {
        if (!this.hasLevel(level)) {
          throw new ValidationError(
            `Allowed level '${level}' does not exist`,
            createErrorContext({ component: 'level-manager' }),
          )
        }
      }
    }

    if (filters.blockedLevels) {
      for (const level of filters.blockedLevels) {
        if (!this.hasLevel(level)) {
          throw new ValidationError(
            `Blocked level '${level}' does not exist`,
            createErrorContext({ component: 'level-manager' }),
          )
        }
      }
    }
  }

  /**
   * Build level hierarchy
   *
   * @private
   * @param {CustomLogLevel[]} levels - Array of custom log levels to build hierarchy
   * @returns {LevelHierarchy} - The constructed level hierarchy
   * @throws {ValidationError} If there are conflicts in level names or values.
   */
  private buildHierarchy(levels: CustomLogLevel[]): LevelHierarchy {
    const levelMap = new Map<string, number>()
    const aliasMap = new Map<string, string>()
    const reverseMap = new Map<number, string>()

    for (const level of levels) {
      levelMap.set(level.name, level.value)
      reverseMap.set(level.value, level.name)

      // Add aliases
      if (level.aliases) {
        for (const alias of level.aliases) {
          aliasMap.set(alias, level.name)
        }
      }
    }

    const sortedLevels = Array.from(levelMap.keys())
      .sort((a, b) => levelMap.get(a)! - levelMap.get(b)!)

    return {
      levels: levelMap,
      aliases: aliasMap,
      reverseLookup: reverseMap,
      sortedLevels,
    }
  }

  /**
   * Rebuild hierarchy after changes
   *
   * This method should be called whenever levels are added or removed
   * to ensure the hierarchy is up-to-date.
   *
   * @private
   * @throws {ValidationError} If there are conflicts in level names or values.
   * @returns {void}
   */
  private rebuildHierarchy(): void {
    const enabledLevels = Array.from(this.customLevels.values())
      .filter((level) => level.enabled)
    this.hierarchy = this.buildHierarchy(enabledLevels)
  }

  /**
   * Export configuration
   *
   * Returns the current configuration of custom levels, filters, and dynamic levels.
   *
   * @returns {Object} - The exported configuration object containing:
   * - customLevels: Array of CustomLogLevel objects
   * - filters: Current LevelFilter configuration
   * - dynamicLevels: Record of dynamic level overrides
   */
  exportConfig(): {
    customLevels: CustomLogLevel[]
    filters: LevelFilter
    dynamicLevels: Record<string, number>
  } {
    return {
      customLevels: Array.from(this.customLevels.values()),
      filters: this.getFilters(),
      dynamicLevels: Object.fromEntries(this.dynamicLevels),
    }
  }

  /**
   * Import configuration
   *
   * This method allows importing a configuration object to set custom levels,
   * filters, and dynamic levels.
   *
   * @param {Object} config - The configuration object to import
   * @param {CustomLogLevel[]} [config.customLevels] - Array of custom log levels to set
   * @param {LevelFilter} [config.filters] - Level filter configuration
   * @param {Record<string, number>} [config.dynamicLevels] - Record of dynamic level overrides
   * @throws {ValidationError} If the configuration is invalid or contains conflicts.
   * @returns {void}
   */
  importConfig(config: {
    customLevels?: CustomLogLevel[]
    filters?: LevelFilter
    dynamicLevels?: Record<string, number>
  }): void {
    if (config.customLevels) {
      this.customLevels.clear()
      this.initializeStandardLevels()
      this.addCustomLevels(config.customLevels)
    }

    if (config.filters) {
      this.setFilters(config.filters)
    }

    if (config.dynamicLevels) {
      this.dynamicLevels.clear()
      for (const [name, value] of Object.entries(config.dynamicLevels)) {
        this.setDynamicLevel(name, value)
      }
    }
  }
}

/**
 * Global level manager instance
 *
 * This instance is used to manage log levels across the application.
 * It allows for a single point of configuration and access to log levels,
 * ensuring consistency in logging behavior.
 */
let globalLevelManager: LogLevelManager | null = null

/**
 * Get or create global level manager
 *
 * This function retrieves the global log level manager instance,
 * creating it if it does not already exist.
 * It can also accept custom levels to initialize the manager with.
 *
 * @param {CustomLogLevel[]} [customLevels] - Optional custom log levels to initialize the manager with
 * @returns {LogLevelManager} - The global log level manager instance
 * @throws {ValidationError} If the custom levels are invalid or conflict with existing levels.
 */
export function getGlobalLevelManager(customLevels?: CustomLogLevel[]): LogLevelManager {
  if (!globalLevelManager || customLevels) {
    globalLevelManager = new LogLevelManager(customLevels)
  }
  return globalLevelManager
}

/**
 * Utility functions for level management
 *
 * These functions provide a convenient way to create custom log levels,
 * check if a level name is valid, compare levels, and get the value of a level by name.
 *
 * @param {string} name - The name of the custom log level
 * @param {number} value - The numeric value of the custom log level
 * @param {Partial<CustomLogLevel>} [options] - Optional additional properties for the
 * custom log level, such as description, color, enabled state, and aliases
 * @return {CustomLogLevel} - The created custom log level object
 * @throws {ValidationError} If the level name or value is invalid, or if a level with the same name or value already exists.
 */
export function createCustomLevel(
  name: string,
  value: number,
  options: Partial<CustomLogLevel> = {},
): CustomLogLevel {
  return {
    name,
    value,
    enabled: true,
    ...options,
  }
}

/**
 * Is valid level name
 *
 * Checks if a given level name is valid by verifying if it exists in the global level manager.
 * @param {string} name - The name of the log level to check
 * @returns {boolean} - True if the level name is valid, false otherwise.
 * @throws {ValidationError} If the level name is invalid or does not exist.
 */
export function isValidLevelName(name: string): boolean {
  const manager = getGlobalLevelManager()
  return manager.hasLevel(name)
}

/**
 * Compare two log levels
 *
 * Compares two log levels by their names and returns a numeric value indicating their order.
 * A negative value indicates that level1 is less than level2, zero indicates equality,
 * and a positive value indicates that level1 is greater than level2.
 *
 * @param {string} level1 - The name of the first log level
 * @param {string} level2 - The name of the second log level
 * @returns {number} - The comparison result
 * @throws {ValidationError} If either level does not exist.
 */
export function compareLevels(level1: string, level2: string): number {
  const manager = getGlobalLevelManager()
  return manager.compareLevels(level1, level2)
}

/**
 * Get the value of a log level by its name
 *
 * This function retrieves the numeric value of a log level by its name.
 * If the level does not exist, it returns undefined.
 *
 * @param {string} name - The name of the log level to retrieve
 * @returns {number | undefined} - The numeric value of the log level, or undefined if it does not exist.
 */
export function getLevelValue(name: string): number | undefined {
  const manager = getGlobalLevelManager()
  return manager.getLevelValue(name)
}
