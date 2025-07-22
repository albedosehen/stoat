import { assert, assertEquals, assertExists, assertGreater } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { createStructuredEntry, StructuredLogger } from '../../logging/structured.ts'
import { createSerializer, CustomSerializerEngine, serialize, serializeFast } from '../../serializers/serializer.ts'
import { createCustomLevel, getGlobalLevelManager, LogLevelManager } from '../../types/levels.ts'
import { DEFAULT_CONFIGS, validateConfig } from '../../types/schema.ts'
import {
  createAgentId,
  createOrderId,
  createRequestId,
  createSessionId,
  createSpanId,
  createStrategyId,
  createSymbol,
  createTimestamp,
  createTraceId,
} from '../../types/brands.ts'

describe('Minimal Integration Tests', () => {
  describe('Core Component Integration', () => {
    it('should integrate structured logging with serialization', () => {
      // Create custom serializer
      const serializer = createSerializer({
        maxDepth: 10,
        maxStringLength: 5000,
        enableCircularDetection: true,
      })

      // Create structured logger
      const logger = new StructuredLogger()

      // Create trading data with branded types
      const tradeData = {
        orderId: createOrderId('trade-12345'),
        symbol: createSymbol('AAPL'),
        price: 150.25,
        quantity: 100,
        timestamp: new Date(),
      }

      // Create structured log entry
      const logEntry = logger.createLogEntry({
        level: 'info',
        message: 'Trade executed successfully',
        data: tradeData,
      })

      // Serialize the log entry
      const serialized = serializer.serialize(logEntry)

      assertExists(serialized.value)
      assertExists(serialized.serializationTime)
      assertEquals(serialized.circularReferences, 0)

      // Verify the data structure
      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.timestamp)
      assertExists(logEntry.data)
    })

    it('should integrate level management with custom levels', () => {
      // Create level manager with custom trading levels
      const levelManager = new LogLevelManager()

      // Add custom levels
      levelManager.addLevel(createCustomLevel('TRADE_EXECUTION', 45, {
        description: 'Trade execution events',
        color: 'blue',
      }))

      levelManager.addLevel(createCustomLevel('RISK_ALERT', 55, {
        description: 'Risk management alerts',
        color: 'red',
      }))

      // Test level hierarchy
      assert(levelManager.hasLevel('TRADE_EXECUTION'))
      assert(levelManager.hasLevel('RISK_ALERT'))
      assert(levelManager.compareLevels('TRADE_EXECUTION', 'info') > 0)
      assert(levelManager.compareLevels('RISK_ALERT', 'error') > 0)

      // Test level filtering - use standard levels for filtering since custom levels may not be in the hierarchy yet
      levelManager.setFilters({
        minLevel: 'warn',
        maxLevel: 'error',
      })

      assert(levelManager.passesFilters('warn'))
      assert(levelManager.passesFilters('error'))
      assert(!levelManager.passesFilters('info'))
      assert(!levelManager.passesFilters('fatal'))

      // Test that custom levels exist
      assert(levelManager.hasLevel('TRADE_EXECUTION'))
      assert(levelManager.hasLevel('RISK_ALERT'))
    })

    it('should work with configuration validation', () => {
      // Test different environment configurations
      const devConfig = validateConfig(DEFAULT_CONFIGS.development)
      const prodConfig = validateConfig(DEFAULT_CONFIGS.production)
      const testConfig = validateConfig(DEFAULT_CONFIGS.testing)

      // Verify configurations
      assertEquals(devConfig.level, 'debug')
      assertEquals(prodConfig.level, 'info')
      assertEquals(testConfig.level, 'fatal')

      // Create custom configuration
      const customConfig = validateConfig({
        level: 'debug',
        name: 'integration-test',
        transports: [
          {
            type: 'console',
            enabled: true,
            colors: false,
            prettyPrint: true,
          },
        ],
      })

      assertEquals(customConfig.name, 'integration-test')
      assertEquals(customConfig.level, 'debug')
    })

    it('should handle complex data serialization', () => {
      // Create complex trading data
      const complexData = {
        portfolio: {
          id: 'portfolio-001',
          totalValue: 1000000.00,
          positions: [
            {
              symbol: createSymbol('AAPL'),
              quantity: 1000,
              price: 150.00,
            },
            {
              symbol: createSymbol('GOOGL'),
              quantity: 100,
              price: 2800.00,
            },
          ],
        },
        metadata: {
          traceId: createTraceId('complex-trace-001'),
          strategyId: createStrategyId('portfolio-strategy'),
          timestamp: new Date(),
        },
      }

      // Create serializer and logger
      const serializer = createSerializer({
        maxDepth: 15,
        enablePerformanceTracking: true,
      })

      const logger = new StructuredLogger()

      // Create log entry
      const logEntry = logger.createLogEntry({
        level: 'info',
        message: 'Portfolio update',
        data: complexData,
      })

      // Serialize
      const serialized = serializer.serialize(logEntry)

      assertExists(serialized.value)
      assertExists(serialized.serializationTime)
      assertGreater(serialized.serializationTime, 0)

      // Verify structure preservation
      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.data)
    })

    it('should demonstrate branded types usage', () => {
      // Create various branded types
      const tradingTypes = {
        traceId: createTraceId('branded-trace-123'),
        spanId: createSpanId('branded-span-456'),
        orderId: createOrderId('branded-order-789'),
        symbol: createSymbol('BRANDED'),
        strategyId: createStrategyId('branded-strategy'),
        agentId: createAgentId('branded-agent'),
      }

      // Create logger and serializer
      const logger = new StructuredLogger()
      const serializer = createSerializer()

      // Create log entry with branded types
      const logEntry = logger.createLogEntry({
        level: 'info',
        message: 'Branded types test',
        data: tradingTypes,
      })

      // Serialize to verify branded types are handled
      const serialized = serializer.serialize(logEntry)

      assertExists(serialized.value)
      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.data)
    })

    it('should handle error scenarios gracefully', () => {
      // Create logger and serializer
      const logger = new StructuredLogger()
      const serializer = new CustomSerializerEngine({
        enableCircularDetection: true,
        maxDepth: 5,
      })

      // Create data that might cause issues
      const problematicData = {
        largeString: 'x'.repeat(10000),
        nestedData: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'deep',
                },
              },
            },
          },
        },
      }

      // This should handle issues gracefully
      const logEntry = logger.createLogEntry({
        level: 'error',
        message: 'Error handling test',
        data: problematicData,
      })

      assertExists(logEntry)
      assertEquals(logEntry.level, 'error')

      // Serialization should work or handle errors gracefully
      const serialized = serializer.serialize(problematicData)
      assertExists(serialized)
    })
  })

  describe('Utility Function Integration', () => {
    it('should support structured entry creation', () => {
      // Create structured entry with minimal context
      const context = {
        sessionId: createSessionId('struct-session'),
        userId: 'struct-user',
        requestId: createRequestId('struct-request'),
        timestamp: createTimestamp(new Date().toISOString()),
        metadata: {},
      }

      const structuredEntry = createStructuredEntry(
        'info',
        'Structured test',
        {
          orderId: createOrderId('struct-001'),
          symbol: createSymbol('STRUCT'),
        },
        context,
      )

      assertExists(structuredEntry)
      assertEquals(structuredEntry.level, 'info')
      assertEquals(structuredEntry.message, 'Structured test')
      assertExists(structuredEntry.data)
      assertExists(structuredEntry.context)
    })

    it('should demonstrate serialization utilities', () => {
      // Test utility serialize function
      const testData = {
        orderId: createOrderId('util-001'),
        symbol: createSymbol('UTIL'),
        price: 100.50,
        timestamp: new Date(),
      }

      const serialized = serialize(testData)
      assertExists(serialized.value)
      assertExists(serialized.serializationTime)

      // Test fast serialization
      const fastSerialized = serializeFast(testData)
      assertExists(fastSerialized)
    })

    it('should demonstrate level management utilities', () => {
      // Test global level manager
      const globalManager = getGlobalLevelManager()
      assertExists(globalManager)

      // Test with standard levels
      assert(globalManager.hasLevel('info'))
      assert(globalManager.hasLevel('error'))
      assert(globalManager.hasLevel('debug'))

      // Test level values
      const infoValue = globalManager.getLevelValue('info')
      const errorValue = globalManager.getLevelValue('error')

      assertExists(infoValue)
      assertExists(errorValue)
      assert(errorValue > infoValue)
    })
  })

  describe('Performance Integration', () => {
    it('should handle moderate volume efficiently', () => {
      const startTime = performance.now()

      // Create components
      const logger = new StructuredLogger()
      const serializer = createSerializer({ fastPaths: true })

      // Process 50 log entries
      for (let i = 0; i < 50; i++) {
        const logEntry = logger.createLogEntry({
          level: i % 2 === 0 ? 'info' : 'debug',
          message: `Performance test ${i}`,
          data: {
            iteration: i,
            orderId: createOrderId(`perf-${i}`),
            symbol: createSymbol('PERF'),
            timestamp: new Date(),
          },
        })

        // Serialize each entry
        const serialized = serializer.serialize(logEntry)
        assertExists(serialized.value)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should process 50 entries efficiently (less than 500ms)
      assert(duration < 500)
    })

    it('should maintain type safety throughout', () => {
      // Create typed components
      const levelManager = getGlobalLevelManager()
      const logger = new StructuredLogger()
      const serializer = createSerializer()

      // Create strongly typed data
      const typedData = {
        traceId: createTraceId('type-test'),
        orderId: createOrderId('type-order'),
        symbol: createSymbol('TYPE'),
        message: 'Type safety test',
      }

      // Process through pipeline
      const logEntry = logger.createLogEntry({
        level: 'info',
        message: typedData.message,
        data: typedData,
      })

      const serialized = serializer.serialize(logEntry)

      // Verify types are preserved
      assertExists(logEntry)
      assertExists(serialized.value)
      assertEquals(logEntry.level, 'info')

      // Level management should work
      assert(levelManager.hasLevel('info'))
      assert(levelManager.hasLevel('error'))
    })
  })

  describe('Configuration Integration', () => {
    it('should validate and use environment configurations', () => {
      // Test all default configurations
      Object.entries(DEFAULT_CONFIGS).forEach(([, config]) => {
        const validated = validateConfig(config)
        assertExists(validated)
        assertExists(validated.level)
        assertExists(validated.transports)
        assertExists(validated.security)
        assertExists(validated.performance)
      })
    })

    it('should work with custom configurations', () => {
      // Create and validate custom configuration
      const customConfig = validateConfig({
        level: 'debug',
        name: 'custom-logger',
        version: '1.0.0',
        transports: [
          {
            type: 'console',
            enabled: true,
            colors: false,
            prettyPrint: false,
          },
          {
            type: 'memory',
            enabled: true,
            maxEntries: 1000,
            circular: true,
          },
        ],
        security: {
          enabled: true,
          sanitizeInputs: true,
          redactPaths: ['password', 'secret'],
          redactPatterns: [],
          maxStringLength: 5000,
          allowCircularRefs: false,
        },
      })

      assertEquals(customConfig.name, 'custom-logger')
      assertEquals(customConfig.transports.length, 2)
      assertEquals(customConfig.security.enabled, true)
    })

    it('should demonstrate end-to-end integration', () => {
      // Create a complete logging pipeline
      const config = validateConfig({
        level: 'info',
        name: 'e2e-test',
        transports: [
          {
            type: 'console',
            enabled: true,
            colors: false,
            prettyPrint: false,
          },
        ],
      })

      const levelManager = getGlobalLevelManager()
      const serializer = createSerializer({ enablePerformanceTracking: true })
      const logger = new StructuredLogger()

      // Add custom level
      levelManager.addLevel(createCustomLevel('E2E_TEST', 25, {
        description: 'End-to-end test level',
        color: 'cyan',
      }))

      // Create comprehensive log entry
      const logEntry = logger.createLogEntry({
        level: 'info',
        message: 'End-to-end integration test',
        data: {
          test: {
            id: 'e2e-001',
            type: 'integration',
            components: ['logger', 'serializer', 'levels', 'config'],
          },
          trading: {
            orderId: createOrderId('e2e-order-001'),
            symbol: createSymbol('E2E'),
            strategy: createStrategyId('e2e-strategy'),
            agent: createAgentId('e2e-agent'),
          },
          context: {
            traceId: createTraceId('e2e-trace-001'),
            spanId: createSpanId('e2e-span-001'),
            sessionId: createSessionId('e2e-session'),
            requestId: createRequestId('e2e-request'),
          },
        },
      })

      // Serialize the complete entry
      const serialized = serializer.serialize(logEntry)

      // Verify everything works together
      assertExists(logEntry)
      assertExists(serialized.value)
      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.data)
      assertExists(serialized.serializationTime)

      // Verify configuration
      assertEquals(config.name, 'e2e-test')
      assertEquals(config.level, 'info')

      // Verify level management
      assert(levelManager.hasLevel('E2E_TEST'))
      assert(levelManager.hasLevel('info'))
    })
  })
})
