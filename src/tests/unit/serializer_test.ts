import { assert, assertEquals, assertExists, assertGreater, assertLessOrEqual, assertThrows } from '@std/assert'
import { beforeEach, describe, it } from '@std/testing/bdd'
import {
  createSerializer,
  type CustomSerializer,
  CustomSerializerEngine,
  getDefaultSerializer,
  serialize,
  serializeFast,
  type SerializerConfig,
} from '../../serializers/serializer.ts'
import { createOrderId, createSymbol, createTraceId } from '../../types/brands.ts'

describe('Custom Serializer System', () => {
  let serializer: CustomSerializerEngine
  let testConfig: SerializerConfig

  beforeEach(() => {
    testConfig = {
      maxDepth: 10,
      maxStringLength: 1000,
      maxArrayLength: 100,
      maxObjectKeys: 50,
      includeNonEnumerable: false,
      includePrototype: false,
      enableCircularDetection: true,
      enablePerformanceTracking: true,
      customSerializers: {},
      fastPaths: true,
    }

    serializer = new CustomSerializerEngine(testConfig)
  })

  describe('Serializer Creation and Configuration', () => {
    it('should create serializer with default configuration', () => {
      const defaultSerializer = new CustomSerializerEngine()
      assertExists(defaultSerializer)

      const config = defaultSerializer.getConfig()
      assertEquals(config.maxDepth, 10)
      assertEquals(config.maxStringLength, 10000)
      assertEquals(config.enableCircularDetection, true)
      assertEquals(config.fastPaths, true)
    })

    it('should create serializer with custom configuration', () => {
      const customConfig = {
        maxDepth: 5,
        maxStringLength: 500,
        enablePerformanceTracking: false,
        fastPaths: false,
      }

      const customSerializer = new CustomSerializerEngine(customConfig)
      const config = customSerializer.getConfig()

      assertEquals(config.maxDepth, 5)
      assertEquals(config.maxStringLength, 500)
      assertEquals(config.enablePerformanceTracking, false)
      assertEquals(config.fastPaths, false)
    })

    it('should update configuration at runtime', () => {
      const newConfig = {
        maxDepth: 3,
        enableCircularDetection: false,
      }

      serializer.updateConfig(newConfig)
      const config = serializer.getConfig()

      assertEquals(config.maxDepth, 3)
      assertEquals(config.enableCircularDetection, false)
      assertEquals(config.maxStringLength, 1000) // Should preserve other settings
    })

    it('should create serializer using factory function', () => {
      const factorySerializer = createSerializer({
        maxDepth: 8,
        enablePerformanceTracking: true,
      })

      assertExists(factorySerializer)
      assertEquals(factorySerializer.getConfig().maxDepth, 8)
    })
  })

  describe('Basic Serialization', () => {
    it('should serialize primitive values', () => {
      const testCases = [
        { input: null, expected: null },
        { input: undefined, expected: undefined },
        { input: true, expected: true },
        { input: false, expected: false },
        { input: 42, expected: 42 },
        { input: 3.14159, expected: 3.14159 },
        { input: 'hello world', expected: 'hello world' },
        { input: '', expected: '' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = serializer.serialize(input)
        assertEquals(result.value, expected)
        assertEquals(result.truncated, false)
        assertEquals(result.circularReferences, 0)
      })
    })

    it('should serialize BigInt values', () => {
      const bigIntValue = BigInt('12345678901234567890')
      const result = serializer.serialize(bigIntValue)

      assertEquals(result.value, { __type: 'bigint', value: '12345678901234567890' })
    })

    it('should serialize Symbol values', () => {
      const symbolValue = Symbol('test-symbol')
      const result = serializer.serialize(symbolValue)

      assertEquals(result.value, { __type: 'symbol', description: 'test-symbol' })
    })

    it('should serialize Date objects', () => {
      const dateValue = new Date('2025-01-01T00:00:00.000Z')
      const result = serializer.serialize(dateValue)

      assertEquals(result.value, '2025-01-01T00:00:00.000Z')
    })

    it('should serialize RegExp objects', () => {
      const regexValue = /test-pattern/gi
      const result = serializer.serialize(regexValue)

      assertEquals(result.value, {
        __type: 'regexp',
        source: 'test-pattern',
        flags: 'gi',
      })
    })

    it('should serialize Function objects', () => {
      function testFunction(a: number, b: number) {
        return a + b
      }
      testFunction.customProperty = 'test'

      const result = serializer.serialize(testFunction)

      assertEquals(result.value, {
        __type: 'function',
        name: 'testFunction',
        length: 2,
      })
    })
  })

  describe('Array Serialization', () => {
    it('should serialize simple arrays', () => {
      const arrayValue = [1, 'two', true, null]
      const result = serializer.serialize(arrayValue)

      assertEquals(result.value, [1, 'two', true, null])
    })

    it('should handle array length limits', () => {
      const largeArray = Array.from({ length: 200 }, (_, i) => i)
      const result = serializer.serialize(largeArray)

      const resultArray = result.value as unknown[]
      assertLessOrEqual(resultArray.length, 101) // 100 items + truncation indicator

      // Should include truncation indicator
      const lastItem = resultArray[resultArray.length - 1]
      assert(typeof lastItem === 'string' && lastItem.includes('more items'))
    })

    it('should serialize nested arrays', () => {
      const nestedArray = [
        [1, 2, 3],
        ['a', 'b', 'c'],
        [true, false, null],
      ]

      const result = serializer.serialize(nestedArray)
      assertEquals(result.value, nestedArray)
    })

    it('should handle mixed type arrays', () => {
      const mixedArray = [
        42,
        'string',
        { key: 'value' },
        [1, 2, 3],
        new Date('2025-01-01'),
        /pattern/g,
      ]

      const result = serializer.serialize(mixedArray)
      const resultArray = result.value as unknown[]

      assertEquals(resultArray[0], 42)
      assertEquals(resultArray[1], 'string')
      assertEquals(resultArray[2], { key: 'value' })
      assertEquals(resultArray[3], [1, 2, 3])
      assertEquals(resultArray[4], '2025-01-01T00:00:00.000Z')
      assertEquals((resultArray[5] as Record<string, unknown>).__type, 'regexp')
    })
  })

  describe('Object Serialization', () => {
    it('should serialize simple objects', () => {
      const objectValue = {
        name: 'test',
        age: 30,
        active: true,
        score: null,
      }

      const result = serializer.serialize(objectValue)
      assertEquals(result.value, objectValue)
    })

    it('should handle object key limits', () => {
      const largeObject: Record<string, number> = {}
      for (let i = 0; i < 100; i++) {
        largeObject[`key${i}`] = i
      }

      const result = serializer.serialize(largeObject)
      const resultObj = result.value as Record<string, unknown>

      // Should limit to maxObjectKeys (50) + truncation indicator
      assertLessOrEqual(Object.keys(resultObj).length, 51)

      // Should include truncation indicator
      if (Object.keys(resultObj).length === 51) {
        assertExists(resultObj['...'])
        assert(typeof resultObj['...'] === 'string')
      }
    })

    it('should serialize nested objects', () => {
      const nestedObject = {
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            email: 'john@example.com',
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
      }

      const result = serializer.serialize(nestedObject)
      assertEquals(result.value, nestedObject)
    })

    it('should handle depth limits', () => {
      const deepObject: Record<string, unknown> = { level: 0 }
      let current = deepObject
      for (let i = 1; i <= 15; i++) {
        current.nested = { level: i }
        current = current.nested as Record<string, unknown>
      }

      const result = serializer.serialize(deepObject)

      // Should be truncated at maxDepth
      assert(JSON.stringify(result.value).includes('[MAX_DEPTH_EXCEEDED]'))
    })
  })

  describe('String Length Limits', () => {
    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000)
      const result = serializer.serialize(longString)

      const resultString = result.value as string
      assertLessOrEqual(resultString.length, 1000 + 15) // maxStringLength + truncation suffix
      assert(resultString.includes('...[TRUNCATED]'))
    })

    it('should not truncate short strings', () => {
      const shortString = 'short string'
      const result = serializer.serialize(shortString)

      assertEquals(result.value, shortString)
    })
  })

  describe('Circular Reference Detection', () => {
    it('should detect circular references in objects', () => {
      const circularObject: Record<string, unknown> = { name: 'test' }
      circularObject.self = circularObject

      assertThrows(
        () => serializer.serialize(circularObject),
        Error,
        'Circular reference detected',
      )
    })

    it('should detect circular references in arrays', () => {
      const circularArray: unknown[] = [1, 2, 3]
      circularArray.push(circularArray)

      assertThrows(
        () => serializer.serialize(circularArray),
        Error,
        'Circular reference detected',
      )
    })

    it('should allow circular references when detection disabled', () => {
      const noCircularConfig = {
        ...testConfig,
        enableCircularDetection: false,
      }

      const noCircularSerializer = new CustomSerializerEngine(noCircularConfig)
      const circularObject: Record<string, unknown> = { name: 'test' }
      circularObject.self = circularObject

      // Should not throw
      const result = noCircularSerializer.serialize(circularObject)
      assertExists(result)
    })
  })

  describe('Collection Types', () => {
    it('should serialize Map objects', () => {
      const mapValue = new Map<unknown, unknown>([
        ['key1', 'value1'],
        ['key2', 42],
        [123, 'numeric key'],
      ])

      const result = serializer.serialize(mapValue)
      interface MapResult {
        __type: string
        size: number
        entries: unknown[][]
      }
      const resultObj = result.value as MapResult

      assertEquals(resultObj.__type, 'map')
      assertEquals(resultObj.size, 3)
      assertEquals(resultObj.entries.length, 3)
      assertEquals(resultObj.entries[0], ['key1', 'value1'])
    })

    it('should serialize Set objects', () => {
      const setValue = new Set(['item1', 'item2', 'item3', 'item1']) // Duplicate should be removed

      const result = serializer.serialize(setValue)
      interface SetResult {
        __type: string
        size: number
        values: unknown[]
      }
      const resultObj = result.value as SetResult

      assertEquals(resultObj.__type, 'set')
      assertEquals(resultObj.size, 3) // Set removes duplicates
      assertEquals(resultObj.values.length, 3)
      assert(resultObj.values.includes('item1'))
      assert(resultObj.values.includes('item2'))
      assert(resultObj.values.includes('item3'))
    })

    it('should handle large Maps with truncation', () => {
      const largeMap = new Map()
      for (let i = 0; i < 200; i++) {
        largeMap.set(`key${i}`, `value${i}`)
      }

      const result = serializer.serialize(largeMap)
      interface TruncatedMapResult {
        __type: string
        size: number
        entries: unknown[][]
        truncated: boolean
      }
      const resultObj = result.value as TruncatedMapResult

      assertEquals(resultObj.__type, 'map')
      assertEquals(resultObj.size, 200)
      assertLessOrEqual(resultObj.entries.length, 100) // Should be truncated
      assertEquals(resultObj.truncated, true)
    })

    it('should serialize TypedArray objects', () => {
      const typedArray = new Uint8Array([1, 2, 3, 4, 5])

      const result = serializer.serialize(typedArray)
      interface TypedArrayResult {
        __type: string
        constructor: string
        length: number
        values: number[]
      }
      const resultObj = result.value as TypedArrayResult

      assertEquals(resultObj.__type, 'typedarray')
      assertEquals(resultObj.constructor, 'Uint8Array')
      assertEquals(resultObj.length, 5)
      assertEquals(resultObj.values, [1, 2, 3, 4, 5])
    })
  })

  describe('Error Serialization', () => {
    it('should serialize Error objects', () => {
      const error = new Error('Test error message')
      error.name = 'TestError'
      error.stack = 'TestError: Test error message\n    at test.ts:123:45'

      const result = serializer.serialize(error)
      interface ErrorResult {
        __type: string
        name: string
        message: string
        stack: string
      }
      const resultObj = result.value as ErrorResult

      assertEquals(resultObj.__type, 'error')
      assertEquals(resultObj.name, 'TestError')
      assertEquals(resultObj.message, 'Test error message')
      assertEquals(resultObj.stack, error.stack)
    })

    it('should serialize custom error properties', () => {
      const customError = new Error('Custom error')
      interface ExtendedError extends Error {
        code?: string
        statusCode?: number
        details?: Record<string, unknown>
      }
      ;(customError as ExtendedError).code = 'ERR_CUSTOM'
      ;(customError as ExtendedError).statusCode = 500
      ;(customError as ExtendedError).details = { context: 'test' }

      const result = serializer.serialize(customError)
      interface CustomErrorResult {
        code: string
        statusCode: number
        details: Record<string, unknown>
      }
      const resultObj = result.value as CustomErrorResult

      assertEquals(resultObj.code, 'ERR_CUSTOM')
      assertEquals(resultObj.statusCode, 500)
      assertEquals(resultObj.details, { context: 'test' })
    })
  })

  describe('Custom Serializers', () => {
    it('should use built-in trading-specific serializers', () => {
      const tradeId = createOrderId('order-123')
      const symbol = createSymbol('AAPL')
      const traceId = createTraceId('trace-456')

      const tradeData = {
        orderId: tradeId,
        symbol: symbol,
        traceId: traceId,
      }

      const result = serializer.serialize(tradeData)
      interface TradeResult {
        orderId: { __type: string; value: string }
        symbol: { __type: string; value: string }
        traceId: { __type: string; value: string }
      }
      const resultObj = result.value as TradeResult

      assertEquals(resultObj.orderId.__type, 'orderId')
      assertEquals(resultObj.orderId.value, 'order-123')
      assertEquals(resultObj.symbol.__type, 'symbol')
      assertEquals(resultObj.symbol.value, 'AAPL')
      assertEquals(resultObj.traceId.__type, 'traceId')
      assertEquals(resultObj.traceId.value, 'trace-456')
    })

    it('should add custom serializers', () => {
      const customSerializer: CustomSerializer = (value: unknown) => ({
        __type: 'custom',
        value: String(value),
        serializedBy: 'customSerializer',
      })

      serializer.addCustomSerializer('CustomType', customSerializer)

      // Create an object that would match the custom type
      const customObject = Object.create(null)
      Object.defineProperty(customObject, 'constructor', {
        value: { name: 'CustomType' },
      })
      customObject.data = 'test data'

      const result = serializer.serialize(customObject)
      interface CustomResult {
        __type: string
        serializedBy: string
      }
      const resultObj = result.value as CustomResult

      assertEquals(resultObj.__type, 'custom')
      assertEquals(resultObj.serializedBy, 'customSerializer')
    })

    it('should remove custom serializers', () => {
      serializer.addCustomSerializer('TestType', () => ({ custom: true }))

      const removed = serializer.removeCustomSerializer('TestType')
      assertEquals(removed, true)

      const removedAgain = serializer.removeCustomSerializer('TestType')
      assertEquals(removedAgain, false)
    })
  })

  describe('Fast Path Optimization', () => {
    it('should use fast path for simple values', () => {
      const simpleValues = [
        null,
        undefined,
        42,
        'simple string',
        true,
        false,
      ]

      simpleValues.forEach((value) => {
        const result = serializer.serializeFast(value)
        assertEquals(result, value)
      })
    })

    it('should use fast path for simple objects', () => {
      const simpleObject = {
        name: 'test',
        age: 30,
        active: true,
      }

      const result = serializer.serializeFast(simpleObject)
      assertEquals(result, simpleObject)
    })

    it('should fall back to full serialization for complex objects', () => {
      const complexObject = {
        deep: {
          nested: {
            object: {
              with: 'many levels',
            },
          },
        },
      }

      const result = serializer.serializeFast(complexObject)
      // Should fall back to full serialization
      assertExists(result)
    })

    it('should handle Date objects in fast path', () => {
      const dateValue = new Date('2025-01-01T00:00:00.000Z')
      const result = serializer.serializeFast(dateValue)

      assertEquals(result, '2025-01-01T00:00:00.000Z')
    })

    it('should handle BigInt in fast path', () => {
      const bigIntValue = BigInt('123456789')
      const result = serializer.serializeFast(bigIntValue)

      assertEquals(result, '123456789')
    })
  })

  describe('Performance Tracking', () => {
    it('should track performance metrics when enabled', () => {
      const trackingSerializer = new CustomSerializerEngine({
        ...testConfig,
        enablePerformanceTracking: true,
      })

      // Perform multiple serializations
      for (let i = 0; i < 5; i++) {
        trackingSerializer.serialize({ iteration: i, data: 'test data' })
      }

      const stats = trackingSerializer.getPerformanceStats()
      assertEquals(stats.totalSerializations, 5)
      assertGreater(stats.totalTime, 0)
    })

    it('should reset performance statistics', () => {
      // Perform some serializations
      serializer.serialize({ test: 'data' })
      serializer.serialize([1, 2, 3])

      let stats = serializer.getPerformanceStats()
      assertGreater(stats.totalSerializations, 0)

      serializer.resetPerformanceStats()
      stats = serializer.getPerformanceStats()

      assertEquals(stats.totalSerializations, 0)
      assertEquals(stats.totalTime, 0)
      assertEquals(stats.circularReferences, 0)
      assertEquals(stats.truncations, 0)
    })

    it('should track serialization time', () => {
      const result = serializer.serialize({
        large: Array.from({ length: 100 }, (_, i) => ({ id: i, data: `item-${i}` })),
      })

      assertGreater(result.serializationTime, 0)
    })

    it('should estimate memory usage', () => {
      const result = serializer.serialize({
        data: 'test string',
        numbers: [1, 2, 3, 4, 5],
        nested: { key: 'value' },
      })

      assertExists(result.memoryUsage)
      assertGreater(result.memoryUsage!, 0)
    })
  })

  describe('Utility Functions', () => {
    it('should provide default serializer', () => {
      const defaultSerializer = getDefaultSerializer()
      assertExists(defaultSerializer)

      const result = defaultSerializer.serialize({ test: 'data' })
      assertEquals(result.value, { test: 'data' })
    })

    it('should use utility serialize function', () => {
      const result = serialize({ utility: 'test' })

      assertEquals(result.value, { utility: 'test' })
      assertExists(result.serializationTime)
    })

    it('should use utility serializeFast function', () => {
      const result = serializeFast('fast test')
      assertEquals(result, 'fast test')
    })

    it('should pass configuration to utility functions', () => {
      const customConfig = { maxStringLength: 5 }
      const longString = 'this is a very long string'

      const result = serialize(longString, customConfig)
      const resultString = result.value as string

      assert(resultString.includes('...[TRUNCATED]'))
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty objects and arrays', () => {
      const emptyObject = {}
      const emptyArray: unknown[] = []

      const objResult = serializer.serialize(emptyObject)
      const arrResult = serializer.serialize(emptyArray)

      assertEquals(objResult.value, {})
      assertEquals(arrResult.value, [])
    })

    it('should handle objects with null prototype', () => {
      const nullProtoObject = Object.create(null)
      nullProtoObject.key = 'value'

      const result = serializer.serialize(nullProtoObject)
      assertEquals(result.value, { key: 'value' })
    })

    it('should handle property access errors', () => {
      const problematicObject = {}
      Object.defineProperty(problematicObject, 'badProperty', {
        get() {
          throw new Error('Property access error')
        },
        enumerable: true,
      })

      // Should not throw, should handle the error gracefully
      const result = serializer.serialize(problematicObject)
      interface ProblematicResult {
        badProperty: string
      }
      const resultObj = result.value as ProblematicResult

      assert(typeof resultObj.badProperty === 'string')
      assert(resultObj.badProperty.includes('ERROR'))
    })

    it('should handle non-enumerable properties when configured', () => {
      const objectWithNonEnum = { enumerable: 'visible' }
      Object.defineProperty(objectWithNonEnum, 'nonEnumerable', {
        value: 'hidden',
        enumerable: false,
      })

      const includeNonEnumConfig = {
        ...testConfig,
        includeNonEnumerable: true,
      }

      const includeSerializer = new CustomSerializerEngine(includeNonEnumConfig)
      const result = includeSerializer.serialize(objectWithNonEnum)
      interface NonEnumResult {
        enumerable: string
        nonEnumerable: string
      }
      const resultObj = result.value as NonEnumResult

      assertEquals(resultObj.enumerable, 'visible')
      assertEquals(resultObj.nonEnumerable, 'hidden')
    })

    it('should handle very large numbers', () => {
      const largeNumbers = {
        maxSafe: Number.MAX_SAFE_INTEGER,
        maxValue: Number.MAX_VALUE,
        minValue: Number.MIN_VALUE,
        infinity: Infinity,
        negInfinity: -Infinity,
        notANumber: NaN,
      }

      const result = serializer.serialize(largeNumbers)
      const resultObj = result.value as typeof largeNumbers

      assertEquals(resultObj.maxSafe, Number.MAX_SAFE_INTEGER)
      assertEquals(resultObj.maxValue, Number.MAX_VALUE)
      assertEquals(resultObj.minValue, Number.MIN_VALUE)
      assertEquals(resultObj.infinity, Infinity)
      assertEquals(resultObj.negInfinity, -Infinity)
      assert(Number.isNaN(resultObj.notANumber))
    })
  })
})
