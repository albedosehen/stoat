import { assert, assertEquals, assertExists, assertThrows } from '@std/assert'
import { beforeEach, describe, it } from '@std/testing/bdd'
import {
  createStructuredEntry,
  createStructuredLogger,
  type SerializationOptions,
  serializeLogEntry,
  type StructuredLogEntry,
  StructuredLogger,
} from './structured.ts'
import type { LogLevelName } from '../config/schema.ts'
import type { StoatContext } from '../context/correlation.ts'
import { createLogMessage, createRequestId, createSpanId, createTimestamp, createTraceId } from '../types/brands.ts'

describe('Structured Logging System', () => {
  let logger: StructuredLogger
  let testContext: StoatContext

  beforeEach(() => {
    logger = new StructuredLogger()
    testContext = {
      timestamp: createTimestamp(new Date().toISOString()),
      sessionId: 'test-session-123' as never,
      traceId: createTraceId('trace-abc-123'),
      spanId: createSpanId('span-def-456'),
      requestId: createRequestId('req-ghi-789'),
      component: 'test-component',
      module: 'structured-logging',
      environment: 'test',
    }
  })

  describe('StructuredLogger Creation and Configuration', () => {
    it('should create logger with default options', () => {
      const defaultLogger = new StructuredLogger()
      assertExists(defaultLogger)

      const options = defaultLogger.getOptions()
      assertEquals(options.pretty, false)
      assertEquals(options.maxDepth, 10)
      assertEquals(options.maxArrayLength, 1000)
      assertEquals(options.maxStringLength, 10000)
    })

    it('should create logger with custom options', () => {
      const customOptions: SerializationOptions = {
        pretty: true,
        maxDepth: 5,
        maxStringLength: 1000,
        includeStackTrace: false,
        timestampFormat: 'unix',
        levelFormat: 'number',
      }

      const customLogger = new StructuredLogger(customOptions)
      const options = customLogger.getOptions()

      assertEquals(options.pretty, true)
      assertEquals(options.maxDepth, 5)
      assertEquals(options.maxStringLength, 1000)
      assertEquals(options.includeStackTrace, false)
      assertEquals(options.timestampFormat, 'unix')
    })

    it('should update options at runtime', () => {
      logger.updateOptions({ pretty: true, maxDepth: 3 })
      const options = logger.getOptions()

      assertEquals(options.pretty, true)
      assertEquals(options.maxDepth, 3)
      assertEquals(options.maxStringLength, 10000) // Should preserve other options
    })
  })

  describe('Log Entry Creation', () => {
    it('should create basic structured log entry', () => {
      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Test message',
        context: testContext,
      })

      assertEquals(entry.level, 'info')
      assertEquals(entry.message, 'Test message')
      assertEquals(entry.levelValue, 30)
      assertEquals(entry.traceId, testContext.traceId)
      assertEquals(entry.spanId, testContext.spanId)
      assertEquals(entry.component, 'test-component')
      assertExists(entry.timestamp)
    })

    it('should create entry with data payload', () => {
      const testData = {
        orderId: 'order-123',
        symbol: 'AAPL',
        quantity: 100,
        price: 150.25,
      }

      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Order placed',
        data: testData,
        context: testContext,
      })

      assertEquals(entry.data, testData)
      assertExists(entry.timestamp)
      assertEquals(entry.component, 'test-component')
    })

    it('should create entry with error information', () => {
      const testError = new Error('Test error')
      testError.name = 'TestError'
      testError.stack = 'TestError: Test error\n    at test.ts:123:45'

      const entry = logger.createLogEntry({
        level: 'error',
        message: 'Error occurred',
        error: testError,
        context: testContext,
      })

      assertExists(entry.error)
      assertEquals(entry.error!.name, 'TestError')
      assertEquals(entry.error!.message, 'Test error')
      assertExists(entry.error!.stack)
    })

    it('should extract context fields correctly', () => {
      const richContext: StoatContext = {
        ...testContext,
        version: '2.1.0',
        tags: ['performance', 'monitoring'],
        duration: 123.45,
        memoryUsage: {
          rss: 1024 * 1024,
          heapUsed: 512 * 1024,
          heapTotal: 1024 * 1024,
          external: 256 * 1024,
        },
        metadata: {
          service: 'trading-service',
          customField: 'customValue',
        },
      }

      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Rich context test',
        context: richContext,
      })

      assertEquals(entry.service, 'trading-service')
      assertEquals(entry.version, '2.1.0')
      assertEquals(entry.duration, 123.45)
      assertEquals(entry.memoryUsage, 512 * 1024)
      assertEquals(entry.tags, ['performance', 'monitoring'])
      assertExists(entry.metadata)
    })
  })

  describe('Serialization and Formatting', () => {
    it('should serialize entry to JSON string', () => {
      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Serialization test',
        context: testContext,
      })

      const serialized = logger.serialize(entry)

      assert(typeof serialized === 'string')
      const parsed = JSON.parse(serialized)

      assertEquals(parsed.level, 'info')
      assertEquals(parsed.message, 'Serialization test')
      assertEquals(parsed.traceId, testContext.traceId)
    })

    it('should serialize with pretty printing', () => {
      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Pretty print test',
        context: testContext,
      })

      const serialized = logger.serialize(entry, { pretty: true })

      // Pretty printed JSON should contain newlines and indentation
      assert(serialized.includes('\n'))
      assert(serialized.includes('  '))

      const parsed = JSON.parse(serialized)
      assertEquals(parsed.level, 'info')
    })

    it('should handle serialization options', () => {
      const entry = logger.createLogEntry({
        level: 'debug',
        message: 'Options test',
        data: {
          longString: 'a'.repeat(2000),
          largeArray: Array.from({ length: 50 }, (_, i) => i),
        },
        context: testContext,
      })

      const serialized = logger.serialize(entry, {
        maxStringLength: 100,
        maxArrayLength: 10,
      })

      const parsed = JSON.parse(serialized)

      // String should be truncated
      assert((parsed.data.longString as string).includes('...[TRUNCATED]'))

      // Array should be truncated with indicator
      assert(parsed.data.largeArray.length <= 11) // 10 items + truncation indicator
    })

    it('should exclude specified fields', () => {
      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Exclusion test',
        data: { sensitive: 'data' },
        context: testContext,
      })

      const serialized = logger.serialize(entry, {
        excludeFields: ['data', 'spanId'],
      })

      const parsed = JSON.parse(serialized)

      assertEquals(parsed.data, undefined)
      assertEquals(parsed.spanId, undefined)
      assertEquals(parsed.level, 'info') // Should preserve other fields
    })
  })

  describe('Minimal Entry Creation', () => {
    it('should create minimal log entry', () => {
      const minimal = logger.createMinimalEntry('info', 'Minimal test')

      assert(typeof minimal === 'string')
      const parsed = JSON.parse(minimal)

      assertEquals(parsed.level, 'info')
      assertEquals(parsed.levelValue, 30)
      assertEquals(parsed.message, 'Minimal test')
      assertExists(parsed.timestamp)
    })

    it('should create minimal entry with trace ID', () => {
      const traceId = createTraceId('minimal-trace-123')
      const minimal = logger.createMinimalEntry('error', 'Minimal error', traceId)

      const parsed = JSON.parse(minimal)

      assertEquals(parsed.level, 'error')
      assertEquals(parsed.traceId, traceId)
      assertEquals(parsed.message, 'Minimal error')
    })
  })

  describe('Parsing and Validation', () => {
    it('should parse valid JSON log entry', () => {
      const originalEntry = logger.createLogEntry({
        level: 'warn',
        message: 'Parse test',
        context: testContext,
      })

      const serialized = logger.serialize(originalEntry)
      const parsed = logger.parse(serialized)

      assertEquals(parsed.level, 'warn')
      assertEquals(parsed.message, 'Parse test')
      assertEquals(parsed.traceId, testContext.traceId)
    })

    it('should throw error for invalid JSON', () => {
      assertThrows(
        () => logger.parse('invalid json'),
        Error,
        'Failed to parse log entry',
      )
    })

    it('should throw error for incomplete log entry', () => {
      assertThrows(
        () => logger.parse('{"level": "info"}'), // Missing required fields
        Error,
        'must have timestamp, level, and message fields',
      )
    })
  })

  describe('Field Transformation', () => {
    it('should transform fields using custom mapping', () => {
      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Transform test',
        data: { key: 'value' },
        context: testContext,
      })

      const transformed = logger.transformFields(entry, {
        timestamp: 'ts',
        level: 'severity',
        message: 'msg',
        traceId: 'trace',
        data: 'payload',
      })

      assertEquals(transformed.ts, entry.timestamp)
      assertEquals(transformed.severity, 'info')
      assertEquals(transformed.msg, 'Transform test')
      assertEquals(transformed.trace, testContext.traceId)
      assertEquals(transformed.payload, entry.data)
    })

    it('should preserve unmapped fields', () => {
      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Preserve test',
        context: testContext,
      })

      const transformed = logger.transformFields(entry, {
        level: 'severity',
      })

      assertEquals(transformed.severity, 'info')
      assertEquals(transformed.timestamp, entry.timestamp) // Should preserve
      assertEquals(transformed.message, entry.message) // Should preserve
    })
  })

  describe('Error Handling', () => {
    it('should handle circular references gracefully', () => {
      const circularData: Record<string, unknown> = { name: 'test' }
      circularData.self = circularData

      // Should not throw, should create fallback entry
      const serialized = logger.serialize({
        timestamp: createTimestamp(new Date().toISOString()),
        level: 'info' as LogLevelName,
        levelValue: 30,
        message: createLogMessage('Circular test'),
        data: circularData,
      } as StructuredLogEntry)

      assertExists(serialized)
      assert(typeof serialized === 'string')
    })

    it('should provide fallback for serialization errors', () => {
      // Create an object that will cause serialization issues
      const problematicData = {
        circular: {} as Record<string, unknown>,
      }
      problematicData.circular.ref = problematicData

      const entry: StructuredLogEntry = {
        timestamp: createTimestamp(new Date().toISOString()),
        level: 'error' as LogLevelName,
        levelValue: 50,
        message: createLogMessage('Fallback test'),
        data: problematicData,
      }

      // Should not throw, should return fallback JSON
      const result = logger.serialize(entry)
      assertExists(result)

      const parsed = JSON.parse(result)
      assertExists(parsed.timestamp)
      assertEquals(parsed.level, 'error')
    })
  })

  describe('Utility Functions', () => {
    it('should create structured entry using utility function', () => {
      const entry = createStructuredEntry(
        'info',
        'Utility test',
        { orderId: 'order-456' },
        testContext,
      )

      assertEquals(entry.level, 'info')
      assertEquals(entry.message, 'Utility test')
      assertEquals(entry.data, { orderId: 'order-456' })
      assertEquals(entry.traceId, testContext.traceId)
    })

    it('should serialize entry using utility function', () => {
      const entry = createStructuredEntry('debug', 'Serialize utility test')

      const serialized = serializeLogEntry(entry, { pretty: true })

      assert(typeof serialized === 'string')
      const parsed = JSON.parse(serialized)
      assertEquals(parsed.level, 'debug')
      assertEquals(parsed.message, 'Serialize utility test')
    })

    it('should create logger using factory function', () => {
      const factoryLogger = createStructuredLogger({
        pretty: true,
        maxDepth: 5,
      })

      assertExists(factoryLogger)
      const options = factoryLogger.getOptions()
      assertEquals(options.pretty, true)
      assertEquals(options.maxDepth, 5)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large data structures efficiently', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `item-${i}`,
          metadata: { index: i, type: 'test' },
        })),
      }

      const startTime = performance.now()

      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Large data test',
        data: largeData,
        context: testContext,
      })

      const serialized = logger.serialize(entry, {
        maxArrayLength: 100, // Limit to prevent excessive serialization
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      assertExists(serialized)
      assert(duration < 100) // Should complete quickly

      const parsed = JSON.parse(serialized)
      assertEquals(parsed.level, 'info')
      // Array should be truncated
      assert(parsed.data.items.length <= 101) // 100 items + truncation indicator
    })

    it('should handle deep nesting with depth limits', () => {
      // Create deeply nested object
      const deepObject: Record<string, unknown> = { level: 0 }
      let current = deepObject
      for (let i = 1; i <= 20; i++) {
        current.nested = { level: i }
        current = current.nested as Record<string, unknown>
      }

      const entry = logger.createLogEntry({
        level: 'debug',
        message: 'Deep nesting test',
        data: deepObject,
        context: testContext,
      })

      const serialized = logger.serialize(entry, { maxDepth: 5 })

      const parsed = JSON.parse(serialized)
      assertEquals(parsed.level, 'debug')
      // Should have depth limit applied
      assertExists(parsed.data)
    })

    it('should handle various data types correctly', () => {
      const mixedData = {
        string: 'test string',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        date: new Date('2025-01-01T00:00:00Z'),
        regex: /test-pattern/gi,
        error: new Error('Test error'),
        bigint: BigInt(123456789),
        symbol: Symbol('test-symbol'),
        function: () => 'test',
        map: new Map([['key1', 'value1'], ['key2', 'value2']]),
        set: new Set(['item1', 'item2', 'item3']),
        typedArray: new Uint8Array([1, 2, 3, 4, 5]),
      }

      const entry = logger.createLogEntry({
        level: 'info',
        message: 'Mixed data types test',
        data: mixedData,
        context: testContext,
      })

      const serialized = logger.serialize(entry)

      assertExists(serialized)
      const parsed = JSON.parse(serialized)

      assertEquals(parsed.level, 'info')
      assertExists(parsed.data)
      assertEquals(parsed.data.string, 'test string')
      assertEquals(parsed.data.number, 42)
      assertEquals(parsed.data.boolean, true)
    })
  })
})
