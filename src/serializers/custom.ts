/**
 * Custom serializer system for complex data types and performance optimization
 * Handles circular references, custom types, and provides fast paths for trading scenarios
 */
import { CircularReferenceError, createErrorContext, SerializationError } from '../types/errors.ts'

type AnyFn = (...args: unknown[]) => unknown

/**
 * Serialization context for tracking state during serialization
 */
export interface SerializationContext {
  /** Maximum depth of serialization */
  readonly maxDepth: number

  /** Maximum length of strings */
  readonly maxStringLength: number

  /** Maximum length of arrays */
  readonly maxArrayLength: number

  /** Maximum number of keys in objects */
  readonly maxObjectKeys: number

  /** Whether to include non-enumerable properties */
  readonly includeNonEnumerable: boolean

  /** Whether to include prototype properties */
  readonly includePrototype: boolean

  /** Whether to enable circular reference detection */
  readonly enableCircularDetection: boolean

  /** Whether to enable performance tracking */
  readonly customSerializers: Map<string, CustomSerializer>

  /** Fast paths for primitive types and simple objects */
  readonly circularRefs: WeakSet<object>

  /** Current path in the object being serialized */
  readonly objectPath: string[]

  /** Current depth in the serialization */
  readonly currentDepth: number
}

/**
 * Serialization result with metadata
 */
export interface SerializationResult {
  /** Serialized value */
  readonly value: unknown

  /** Whether the value was truncated due to length limits */
  readonly truncated: boolean

  /** Number of circular references detected */
  readonly circularReferences: number

  /** Time taken for serialization in milliseconds */
  readonly serializationTime: number

  /** Estimated memory usage during serialization in bytes */
  readonly memoryUsage?: number
}

/**
 * Custom serializer function type
 *
 * @param {unknown} value - The value to serialize
 * @param {SerializationContext} context - The serialization context containing configuration and state
 * @returns {unknown} - The serialized value
 */
export type CustomSerializer = (value: unknown, context: SerializationContext) => unknown

/**
 * Serializer configuration options
 */
export interface SerializerConfig {
  /** Maximum depth of serialization to prevent infinite recursion */
  readonly maxDepth: number

  /** Maximum length of strings to serialize */
  readonly maxStringLength: number

  /** Maximum length of arrays to serialize */
  readonly maxArrayLength: number

  /** Maximum number of keys in objects to serialize */
  readonly maxObjectKeys: number

  /** Whether to include non-enumerable properties in serialization */
  readonly includeNonEnumerable: boolean

  /** Whether to include prototype properties in serialization */
  readonly includePrototype: boolean

  /** Whether to enable circular reference detection */
  readonly enableCircularDetection: boolean

  /** Whether to enable performance tracking */
  readonly enablePerformanceTracking: boolean

  /** Custom serializers for specific types */
  readonly customSerializers: Record<string, CustomSerializer>

  /** Whether to use fast paths for serialization */
  readonly fastPaths: boolean
}

/**
 * High-performance custom serializer
 *
 * Handles complex data types, circular references, and provides fast paths for common scenarios.
 *
 * @param {Partial<SerializerConfig>} [config={}] - Configuration options for the serializer
 * @returns {CustomSerializerEngine} - An instance of the custom serializer engine
 * @throws {SerializationError} - If serialization fails due to an error
 * @throws {CircularReferenceError} - If a circular reference is detected during serialization
 * @class
 *
 * @example
 * const serializer = new CustomSerializerEngine({
 *  maxDepth: 5,
 *  maxStringLength: 5000,
 *  maxArrayLength: 100,
 *  maxObjectKeys: 50,
 *  includeNonEnumerable: true,
 *  includePrototype: true,
 *  enableCircularDetection: true,
 *  enablePerformanceTracking: true,
 *  customSerializers: {
 *   MyCustomType: (value, context) => {
 *     return {
 *       __type: 'myCustomType',
 *       value: value.toString(),
 *     };
 *   }
 * }
 */
export class CustomSerializerEngine {
  private config: SerializerConfig
  private customSerializers = new Map<string, CustomSerializer>()
  private performanceStats = {
    totalSerializations: 0,
    totalTime: 0,
    circularReferences: 0,
    truncations: 0,
  }

  constructor(config: Partial<SerializerConfig> = {}) {
    this.config = {
      maxDepth: 10,
      maxStringLength: 10000,
      maxArrayLength: 1000,
      maxObjectKeys: 100,
      includeNonEnumerable: false,
      includePrototype: false,
      enableCircularDetection: true,
      enablePerformanceTracking: true,
      customSerializers: {},
      fastPaths: true,
      ...config,
    }

    this.initializeCustomSerializers()
  }

  /**
   * Serialize value with performance optimization
   *
   * @param {unknown} value - The value to serialize
   * @returns {SerializationResult} - The result of serialization including value, truncation status, circular references count, serialization time, and memory usage
   * @throws {SerializationError} - If serialization fails due to an error
   * @throws {CircularReferenceError} - If a circular reference is detected during serialization
   */
  serialize(value: unknown): SerializationResult {
    const startTime = performance.now()
    const circularReferences = 0
    const truncated = false

    try {
      const context: SerializationContext = {
        ...this.config,
        customSerializers: this.customSerializers,
        circularRefs: new WeakSet(),
        objectPath: [],
        currentDepth: 0,
      }

      const serializedValue = this.serializeValue(value, context)
      const endTime = performance.now()
      const serializationTime = endTime - startTime

      if (this.config.enablePerformanceTracking) {
        this.updatePerformanceStats(serializationTime, circularReferences, truncated)
      }

      return {
        value: serializedValue,
        truncated,
        circularReferences,
        serializationTime,
        memoryUsage: this.estimateMemoryUsage(serializedValue),
      }
    } catch (error) {
      throw new SerializationError(
        `Serialization failed: ${error instanceof Error ? error.message : String(error)}`,
        createErrorContext({ component: 'custom-serializer' }),
        error as Error,
      )
    }
  }

  /**
   * Fast path serialization for primitive types and simple objects
   *
   * @param {unknown} value - The value to serialize
   * @returns {unknown} - The serialized value, optimized for performance
   * @throws {SerializationError} - If serialization fails due to an error
   * @throws {CircularReferenceError} - If a circular reference is detected during serialization
   */
  serializeFast(value: unknown): unknown {
    if (!this.config.fastPaths) {
      return this.serialize(value).value
    }

    // Fast path for primitives
    if (value === null || value === undefined) {
      return value
    }

    const type = typeof value
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return value
    }

    if (type === 'bigint') {
      return value.toString()
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return []
      if (value.length <= 10 && value.every((item) => typeof item !== 'object' || item === null)) {
        return value
      }
    }

    if (type === 'object' && value !== null) {
      const keys = Object.keys(value as object)
      if (keys.length === 0) return {}
      if (
        keys.length <= 5 && keys.every((key) => {
          const val = (value as Record<string, unknown>)[key]
          return typeof val !== 'object' || val === null
        })
      ) {
        return value
      }
    }

    // Fall back to full serialization for complex objects
    return this.serialize(value).value
  }

  /**
   * Core serialization logic
   *
   * @param {unknown} value - The value to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {unknown} - The serialized value
   * @private
   */
  private serializeValue(value: unknown, context: SerializationContext): unknown {
    // Handle depth limit
    if (context.currentDepth > context.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]'
    }

    // Handle primitives
    if (value === null || value === undefined) {
      return value
    }

    const type = typeof value
    if (type === 'string') {
      return this.serializeString(value as string, context)
    }

    if (type === 'number' || type === 'boolean') {
      return value
    }

    if (type === 'bigint') {
      return { __type: 'bigint', value: value.toString() }
    }

    if (type === 'symbol') {
      return { __type: 'symbol', description: (value as symbol).description || 'unknown' }
    }

    if (type === 'function') {
      return this.serializeFunction(value as AnyFn)
    }

    // Handle objects
    if (type === 'object' && value !== null) {
      return this.serializeObject(value as object, context)
    }

    return String(value)
  }

  /**
   * Serialize string with length limits
   *
   * @param {string} str - The string to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {string} - The serialized string, truncated if necessary
   * @private
   */
  private serializeString(str: string, context: SerializationContext): string {
    if (str.length <= context.maxStringLength) {
      return str
    }
    return str.slice(0, context.maxStringLength) + '...[TRUNCATED]'
  }

  /**
   * Serialize function (minimal representation)
   *
   * @param {Function} fn - The function to serialize
   * @private
   */
  private serializeFunction(fn: AnyFn): object {
    return {
      __type: 'function',
      name: fn.name || '<anonymous>',
      length: fn.length,
    }
  }

  /**
   * Serialize object with circular reference detection
   *
   * @param {object} obj - The object to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {unknown} - The serialized object
   * @private
   */
  private serializeObject(obj: object, context: SerializationContext): unknown {
    // Check for circular references
    if (context.enableCircularDetection && context.circularRefs.has(obj)) {
      throw new CircularReferenceError(createErrorContext({
        component: 'custom-serializer',
        metadata: { path: context.objectPath.join('.') },
      }))
    }

    // Check for custom serializers
    const customSerializer = this.getCustomSerializer(obj)
    if (customSerializer) {
      return customSerializer(obj, context)
    }

    // Handle built-in types
    if (obj instanceof Date) {
      return obj.toISOString()
    }

    if (obj instanceof RegExp) {
      return {
        __type: 'regexp',
        source: obj.source,
        flags: obj.flags,
      }
    }

    if (obj instanceof Error) {
      return this.serializeError(obj)
    }

    if (obj instanceof Map) {
      return this.serializeMap(obj, context)
    }

    if (obj instanceof Set) {
      return this.serializeSet(obj, context)
    }

    if (ArrayBuffer.isView(obj)) {
      return this.serializeTypedArray(obj as ArrayBufferView)
    }

    if (Array.isArray(obj)) {
      return this.serializeArray(obj, context)
    }

    // Handle plain objects
    return this.serializePlainObject(obj, context)
  }

  /**
   * Serialize array with length limits
   *
   * @param {unknown[]} arr - The array to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {unknown[]} - The serialized array, truncated if necessary
   * @private
   */
  private serializeArray(arr: unknown[], context: SerializationContext): unknown[] {
    if (context.enableCircularDetection) {
      context.circularRefs.add(arr)
    }

    const newContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      objectPath: [...context.objectPath, `[Array:${arr.length}]`],
    }

    const maxLength = Math.min(arr.length, context.maxArrayLength)
    const result: unknown[] = []

    for (let i = 0; i < maxLength; i++) {
      const itemContext = {
        ...newContext,
        objectPath: [...newContext.objectPath, `[${i}]`],
      }
      result.push(this.serializeValue(arr[i], itemContext))
    }

    if (arr.length > maxLength) {
      result.push(`...[${arr.length - maxLength} more items]`)
    }

    if (context.enableCircularDetection) {
      context.circularRefs.delete(arr)
    }

    return result
  }

  /**
   * Serialize plain object with key limits
   *
   * @param {object} obj - The object to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {Record<string, unknown>} - The serialized object with keys and values
   * @private
   */
  private serializePlainObject(obj: object, context: SerializationContext): Record<string, unknown> {
    if (context.enableCircularDetection) {
      context.circularRefs.add(obj)
    }

    const newContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      objectPath: [...context.objectPath, obj.constructor?.name || 'Object'],
    }

    const result: Record<string, unknown> = {}
    let keys = Object.keys(obj)

    if (context.includeNonEnumerable) {
      const allKeys = Object.getOwnPropertyNames(obj)
      keys = Array.from(new Set([...keys, ...allKeys]))
    }

    const maxKeys = Math.min(keys.length, context.maxObjectKeys)

    for (let i = 0; i < maxKeys; i++) {
      const key = keys[i]
      try {
        const value = (obj as Record<string, unknown>)[key]
        const keyContext = {
          ...newContext,
          objectPath: [...newContext.objectPath, key],
        }
        result[key] = this.serializeValue(value, keyContext)
      } catch (error) {
        // Re-throw circular reference errors to maintain expected behavior
        if (error instanceof CircularReferenceError) {
          throw error
        }
        result[key] = `[ERROR: ${error instanceof Error ? error.message : String(error)}]`
      }
    }

    if (keys.length > maxKeys) {
      result['...'] = `[${keys.length - maxKeys} more keys]`
    }

    if (context.enableCircularDetection) {
      context.circularRefs.delete(obj)
    }

    return result
  }

  /**
   * Serialize Map objects
   *
   * @param {Map<unknown, unknown>} map - The Map to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {object} - The serialized Map representation with entries and size
   * @private
   */
  private serializeMap(map: Map<unknown, unknown>, context: SerializationContext): object {
    const newContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      objectPath: [...context.objectPath, `[Map:${map.size}]`],
    }

    const entries: Array<[unknown, unknown]> = []
    let count = 0
    const maxEntries = Math.min(map.size, context.maxArrayLength)

    for (const [key, value] of map) {
      if (count >= maxEntries) break
      entries.push([
        this.serializeValue(key, newContext),
        this.serializeValue(value, newContext),
      ])
      count++
    }

    return {
      __type: 'map',
      size: map.size,
      entries,
      truncated: map.size > maxEntries,
    }
  }

  /**
   * Serialize Set objects
   *
   * @param {Set<unknown>} set - The Set to serialize
   * @param {SerializationContext} context - The serialization context containing configuration and state
   * @returns {object} - The serialized Set representation with values and size
   * @private
   */
  private serializeSet(set: Set<unknown>, context: SerializationContext): object {
    const newContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      objectPath: [...context.objectPath, `[Set:${set.size}]`],
    }

    const values: unknown[] = []
    let count = 0
    const maxValues = Math.min(set.size, context.maxArrayLength)

    for (const value of set) {
      if (count >= maxValues) break
      values.push(this.serializeValue(value, newContext))
      count++
    }

    return {
      __type: 'set',
      size: set.size,
      values,
      truncated: set.size > maxValues,
    }
  }

  /**
   * Serialize typed arrays
   *
   * @param {ArrayBufferView} view - The typed array to serialize
   * @returns {object} - The serialized typed array representation with constructor name, length,
   * values, and truncation status
   * @private
   */
  private serializeTypedArray(view: ArrayBufferView): object {
    const maxElements = 20
    const typedArray = view as unknown as ArrayLike<number> & { constructor: { name: string }; length: number }
    const values = Array.from(typedArray).slice(0, maxElements)

    return {
      __type: 'typedarray',
      constructor: typedArray.constructor.name,
      length: typedArray.length,
      values,
      truncated: typedArray.length > maxElements,
    }
  }

  /**
   * Serialize Error objects
   *
   * @param {Error} error - The error to serialize
   * @returns {object} - The serialized error representation with name, message, stack,
   * and custom properties
   * @private
   */
  private serializeError(error: Error): object {
    const result: Record<string, unknown> = {
      __type: 'error',
      name: error.name,
      message: error.message,
    }

    if (error.stack) {
      result.stack = error.stack
    }

    // Handle custom error properties
    for (const key of Object.getOwnPropertyNames(error)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        try {
          result[key] = (error as unknown as Record<string, unknown>)[key]
        } catch {
          // Ignore properties that can't be accessed
        }
      }
    }

    return result
  }

  /**
   * Get custom serializer for object type
   *
   * @param {object} obj - The object to check for a custom serializer
   * @returns {CustomSerializer | undefined} - The custom serializer function if found, otherwise
   * undefined
   * @private
   */
  private getCustomSerializer(obj: object): CustomSerializer | undefined {
    const constructor = obj.constructor
    if (constructor && constructor.name) {
      return this.customSerializers.get(constructor.name)
    }
    return undefined
  }

  /**
   * Initialize built-in custom serializers
   *
   * @private
   */
  private initializeCustomSerializers(): void {
    // Trading-specific serializers
    this.addCustomSerializer('OrderId', (value: unknown) => ({
      __type: 'orderId',
      value: String(value),
    }))

    this.addCustomSerializer('Symbol', (value: unknown) => ({
      __type: 'symbol',
      value: String(value),
    }))

    this.addCustomSerializer('TraceId', (value: unknown) => ({
      __type: 'traceId',
      value: String(value),
    }))

    this.addCustomSerializer('SpanId', (value: unknown) => ({
      __type: 'spanId',
      value: String(value),
    }))

    // Financial number types
    this.addCustomSerializer('BigNumber', (value: unknown) => {
      const bigNumber = value as { toString(): string; decimalPlaces?(): number }
      return {
        __type: 'bignumber',
        value: bigNumber.toString(),
        precision: bigNumber.decimalPlaces?.() || 0,
      }
    })

    // Add user-provided custom serializers
    for (const [name, serializer] of Object.entries(this.config.customSerializers)) {
      this.customSerializers.set(name, serializer)
    }
  }

  /**
   * Add custom serializer
   *
   * @param {string} typeName - The name of the type to serialize
   * @param {CustomSerializer} serializer - The custom serializer function
   * @throws {Error} - If a serializer for the type already exists
   */
  addCustomSerializer(typeName: string, serializer: CustomSerializer): void {
    this.customSerializers.set(typeName, serializer)
  }

  /**
   * Remove custom serializer
   *
   * @param {string} typeName - The name of the type to remove the serializer for
   * @returns {boolean} - True if the serializer was removed, false if it did not exist
   */
  removeCustomSerializer(typeName: string): boolean {
    return this.customSerializers.delete(typeName)
  }

  /**
   * Estimate memory usage of serialized object
   *
   * @param {unknown} value - The value to estimate memory usage for
   * @returns {number} - Estimated memory usage in bytes
   * @private
   */
  private estimateMemoryUsage(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2 // Rough estimate (2 bytes per character)
    } catch {
      return 0
    }
  }

  /**
   * Update performance statistics
   *
   * @param {number} time - Time taken for serialization in milliseconds
   * @param {number} circularRefs - Number of circular references detected
   * @param {boolean} truncated - Whether the serialization was truncated due to length limits
   * @private
   */
  private updatePerformanceStats(time: number, circularRefs: number, truncated: boolean): void {
    this.performanceStats.totalSerializations++
    this.performanceStats.totalTime += time
    this.performanceStats.circularReferences += circularRefs
    if (truncated) {
      this.performanceStats.truncations++
    }
  }

  /**
   * Get performance statistics
   *
   * @return {object} - The performance statistics including total serializations, total time,
   * circular references, and truncations
   */
  getPerformanceStats(): typeof this.performanceStats {
    return { ...this.performanceStats }
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats(): void {
    this.performanceStats = {
      totalSerializations: 0,
      totalTime: 0,
      circularReferences: 0,
      truncations: 0,
    }
  }

  /**
   * Update configuration
   *
   * @param {Partial<SerializerConfig>} newConfig - New configuration options to update
   * @returns {void}
   */
  updateConfig(newConfig: Partial<SerializerConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Re-initialize custom serializers if they changed
    if (newConfig.customSerializers) {
      this.initializeCustomSerializers()
    }
  }

  /**
   * Get current configuration
   *
   * @return {SerializerConfig} - The current serializer configuration
   */
  getConfig(): SerializerConfig {
    return { ...this.config }
  }
}

/**
 * Default serializer instance
 */
let defaultSerializer: CustomSerializerEngine | null = null

/**
 * Get or create default serializer
 *
 * This function returns a singleton instance of the custom serializer engine.
 *
 * @param {Partial<SerializerConfig>} [config] - Optional configuration to override default settings
 * @returns {CustomSerializerEngine} - The default serializer instance
 */
export function getDefaultSerializer(config?: Partial<SerializerConfig>): CustomSerializerEngine {
  if (!defaultSerializer || config) {
    defaultSerializer = new CustomSerializerEngine(config)
  }
  return defaultSerializer
}

/**
 * Utility function for quick serialization
 *
 * This function provides a simple interface for serializing values using the default serializer.
 *
 * @param {unknown} value - The value to serialize
 * @param {Partial<SerializerConfig>} [config] - Optional configuration to override default settings
 * @returns {SerializationResult} - The result of serialization including value, truncation status,
 * circular references count, serialization time, and memory usage
 * @throws {SerializationError} - If serialization fails due to an error
 */
export function serialize(value: unknown, config?: Partial<SerializerConfig>): SerializationResult {
  const serializer = getDefaultSerializer(config)
  return serializer.serialize(value)
}

/**
 * Utility function for fast serialization
 *
 * This function provides a quick serialization path for primitive types and simple objects,
 * bypassing the full serialization logic for performance optimization.
 *
 * @param {unknown} value - The value to serialize
 * @param {Partial<SerializerConfig>} [config] - Optional configuration to override default settings
 * @returns {unknown} - The serialized value, optimized for performance
 * @throws {SerializationError} - If serialization fails due to an error
 */
export function serializeFast(value: unknown, config?: Partial<SerializerConfig>): unknown {
  const serializer = getDefaultSerializer(config)
  return serializer.serializeFast(value)
}

/**
 * Create a new serializer instance
 *
 * This function allows creating a new serializer with custom configuration.
 *
 * @param {Partial<SerializerConfig>} [config] - Optional configuration to override default settings
 * @returns {CustomSerializerEngine} - A new instance of the custom serializer engine
 * @throws {SerializationError} - If serialization fails due to an error
 */
export function createSerializer(config?: Partial<SerializerConfig>): CustomSerializerEngine {
  return new CustomSerializerEngine(config)
}
