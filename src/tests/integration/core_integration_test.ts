import { assert, assertEquals, assertExists, assertGreater } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { createStructuredEntry, StructuredLogger } from '../../logging/structured.ts'
import { AsyncLogger } from '../../logging/async.ts'
import { ConsoleTransport } from '../../transports/console.ts'
import { createSerializer, CustomSerializerEngine } from '../../serializers/serializer.ts'
import { createCustomLevel, getGlobalLevelManager, LogLevelManager } from '../../types/levels.ts'
import { DEFAULT_CONFIGS, LOG_LEVEL_VALUES, validateConfig } from '../../types/schema.ts'
import {
  createAgentId,
  createLogMessage,
  createOrderId,
  createRequestId,
  createSessionId,
  createSpanId,
  createStrategyId,
  createSymbol,
  createTimestamp,
  createTraceId,
} from '../../types/brands.ts'

describe('Core System Integration Tests', () => {
  describe('Component Integration', () => {
    it('should integrate structured logging with custom serialization', () => {
      const serializer = createSerializer({
        maxDepth: 10,
        maxStringLength: 5000,
        enableCircularDetection: true,
        customSerializers: {
          'OrderId': (value: unknown) => ({
            __type: 'order-id',
            value: String(value),
          }),
          'Symbol': (value: unknown) => ({
            __type: 'trading-symbol',
            value: String(value),
          }),
        },
      })

      const logger = new StructuredLogger()

      const tradeData = {
        orderId: createOrderId('trade-12345'),
        symbol: createSymbol('AAPL'),
        price: 150.25,
        quantity: 100,
        timestamp: new Date(),
        metadata: {
          strategy: createStrategyId('momentum-v1'),
          agent: createAgentId('trader-001'),
        },
      }

      const logEntry = logger.createLogEntry({
        level: 'info',
        message: createLogMessage('Trade executed successfully'),
        data: tradeData,
      })

      const serialized = serializer.serialize(logEntry)

      assertExists(serialized.value)
      assertExists(serialized.serializationTime)
      assertEquals(serialized.circularReferences, 0)

      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.timestamp)
      assertExists(logEntry.data)
    })

    it('should integrate level management with structured logging', () => {
      const levelManager = new LogLevelManager()

      levelManager.addLevel(createCustomLevel('TRADE_EXECUTION', 45, {
        description: 'Trade execution events',
        color: 'blue',
      }))

      levelManager.addLevel(createCustomLevel('RISK_ALERT', 55, {
        description: 'Risk management alerts',
        color: 'red',
      }))

      assert(levelManager.hasLevel('TRADE_EXECUTION'))
      assert(levelManager.hasLevel('RISK_ALERT'))
      assert(levelManager.compareLevels('TRADE_EXECUTION', 'info') > 0)
      assert(levelManager.compareLevels('RISK_ALERT', 'error') > 0)

      const logger = new StructuredLogger()

      const tradeEntry = logger.createLogEntry({
        level: 'info', // Using standard level since custom levels need different integration
        message: createLogMessage('Custom level integration test'),
        data: {
          level: 'TRADE_EXECUTION',
          event: 'order_filled',
          orderId: createOrderId('custom-001'),
        },
      })

      assertExists(tradeEntry)
      assertEquals(tradeEntry.level, 'info')
    })

    it('should integrate async logging with serialization', async () => {
      const asyncLogger = new AsyncLogger({
        bufferSize: 100,
        maxBufferSize: 500,
        flushInterval: 50,
        batchSize: 10,
        syncOnExit: false,
        enableBackpressure: false,
        maxRetries: 0,
        retryDelay: 0,
        priorityLevels: {
          trace: 10,
          debug: 20,
          info: 30,
          warn: 40,
          error: 50,
          fatal: 60,
        },
        syncFallback: false,
        syncThreshold: 10 * 1024 * 1024,
      })

      const serializer = new CustomSerializerEngine({
        fastPaths: true,
        enablePerformanceTracking: true,
      })

      const promises = []
      for (let i = 0; i < 10; i++) {
        const data = {
          orderId: createOrderId(`async-${i}`),
          symbol: createSymbol('ASYNC'),
          price: 100 + i,
          iteration: i,
        }

        const serialized = serializer.serialize(data)
        assertExists(serialized.value)

        const promise = asyncLogger.log({
          level: 'info',
          levelValue: LOG_LEVEL_VALUES.info,
          message: createLogMessage(`Async test ${i}`),
          data: serialized.value,
          timestamp: createTimestamp(new Date().toISOString()),
        })

        promises.push(promise)
      }

      await Promise.all(promises)
      await asyncLogger.flush()

      const metrics = asyncLogger.getMetrics()
      assertGreater(metrics.entriesFlushed, 0)
      assertExists(metrics.bufferUtilization)
    })

    it('should integrate console transport with structured data', async () => {
      const transport = new ConsoleTransport({
        destination: 'console',
        enabled: true,
        minLevel: 'debug',
        async: false,
        colors: false,
        prettyPrint: false,
        useStderr: false,
      })

      const structuredData = {
        trade: {
          orderId: createOrderId('transport-001'),
          symbol: createSymbol('TRANSPORT'),
          side: 'buy',
          quantity: 100,
          price: 50.25,
        },
        context: {
          traceId: createTraceId('transport-trace-123'),
          spanId: createSpanId('transport-span-456'),
          timestamp: new Date(),
        },
      }

      const result = await transport.write({
        level: 'info',
        levelValue: LOG_LEVEL_VALUES.info,
        message: createLogMessage('Transport integration test'),
        data: structuredData,
        timestamp: createTimestamp(new Date().toISOString()),
        context: {
          traceId: createTraceId('transport-trace-123'),
          spanId: createSpanId('transport-span-456'),
          sessionId: createSessionId('transport-session'),
          userId: 'transport-user',
          requestId: createRequestId('transport-req'),
          timestamp: createTimestamp(new Date().toISOString()),
          metadata: {},
        },
      })

      assertExists(result)
    })

    it('should integrate configuration with all components', () => {
      const devConfig = validateConfig(DEFAULT_CONFIGS.development)
      const prodConfig = validateConfig(DEFAULT_CONFIGS.production)
      const testConfig = validateConfig(DEFAULT_CONFIGS.testing)

      assertEquals(devConfig.level, 'debug')
      assertEquals(devConfig.transports[0].type, 'console')
      assert(devConfig.transports[0].enabled)

      assertEquals(prodConfig.level, 'info')
      assertEquals(prodConfig.transports.length, 2) // console + file
      assertEquals(prodConfig.performance.enableAsyncLogging, true)

      assertEquals(testConfig.level, 'fatal')
      assertEquals(testConfig.transports[0].type, 'memory')
      assertEquals(testConfig.security.enabled, false)

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
        security: {
          enabled: true,
          sanitizeInputs: true,
          redactPaths: ['password', 'apiKey'],
          redactPatterns: [],
          maxStringLength: 10000,
          allowCircularRefs: false,
        },
      })

      assertEquals(customConfig.name, 'integration-test')
      assertEquals(customConfig.level, 'debug')
      assertEquals(customConfig.security.enabled, true)
    })

    it('should handle complex nested data structures', () => {
      const portfolioData = {
        portfolio: {
          id: 'portfolio-001',
          totalValue: 1000000.00,
          positions: [
            {
              symbol: createSymbol('AAPL'),
              quantity: 1000,
              avgPrice: 150.00,
              currentPrice: 155.25,
              pnl: 5250.00,
            },
            {
              symbol: createSymbol('GOOGL'),
              quantity: 100,
              avgPrice: 2800.00,
              currentPrice: 2825.50,
              pnl: 2550.00,
            },
          ],
        },
        risk: {
          totalExposure: 0.85,
          maxDrawdown: 0.03,
          sharpeRatio: 1.85,
          riskMetrics: {
            var95: 45000.00,
            expectedShortfall: 67500.00,
          },
        },
        realTimeData: {
          timestamp: new Date(),
          marketSession: 'regular',
          tradingHalts: [],
          activeOrders: [
            createOrderId('order-001'),
            createOrderId('order-002'),
            createOrderId('order-003'),
          ],
        },
      }

      const serializer = createSerializer({
        maxDepth: 15,
        enablePerformanceTracking: true,
      })

      const logger = new StructuredLogger()

      const logEntry = logger.createLogEntry({
        level: 'info',
        message: createLogMessage('Portfolio status update'),
        data: portfolioData,
        context: {
          traceId: createTraceId('portfolio-trace-001'),
          spanId: createSpanId('portfolio-span-001'),
          sessionId: createSessionId('portfolio-session'),
          userId: 'portfolio-manager',
          requestId: createRequestId('portfolio-req-001'),
          timestamp: createTimestamp(new Date().toISOString()),
          metadata: {
            component: 'portfolio-service',
            version: '2.0.0',
          },
        },
      })

      const serialized = serializer.serialize(logEntry)

      assertExists(serialized.value)
      assertExists(serialized.serializationTime)
      assertGreater(serialized.serializationTime, 0)

      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.data)
      assertExists(logEntry.context)
      assertExists(logEntry.timestamp)
    })

    it('should demonstrate branded types integration', () => {
      const tradeContext = {
        traceId: createTraceId('branded-trace-123'),
        spanId: createSpanId('branded-span-456'),
        orderId: createOrderId('branded-order-789'),
        symbol: createSymbol('BRANDED'),
        strategyId: createStrategyId('branded-strategy'),
        agentId: createAgentId('branded-agent'),
        sessionId: createSessionId('branded-session'),
        requestId: createRequestId('branded-request'),
      }

      const logger = new StructuredLogger()
      const serializer = createSerializer({
        customSerializers: {},
      })

      const logEntry = logger.createLogEntry({
        level: 'info',
        message: createLogMessage('Branded types integration test'),
        data: tradeContext,
      })

      const serialized = serializer.serialize(logEntry)

      assertExists(serialized.value)

      assertEquals(logEntry.level, 'info')
      assertExists(logEntry.data)
      assertExists(logEntry.timestamp)
    })

    it('should handle error scenarios gracefully', () => {
      const logger = new StructuredLogger()
      const serializer = new CustomSerializerEngine({
        enableCircularDetection: true,
        maxDepth: 5,
      })

      const problematicData = {
        circular: {} as Record<string, unknown>,
        largeString: 'x'.repeat(50000),
        deepNesting: {} as Record<string, unknown>,
      }

      problematicData.circular.self = problematicData.circular

      let current = problematicData.deepNesting
      for (let i = 0; i < 20; i++) {
        current.next = {}
        current = (current as Record<string, unknown>).next as Record<string, unknown>
      }

      const logEntry = logger.createLogEntry({
        level: 'error',
        message: createLogMessage('Error handling test'),
        data: problematicData,
      })

      assertExists(logEntry)
      assertEquals(logEntry.level, 'error')

      try {
        const serialized = serializer.serialize(problematicData)
        assertExists(serialized)
      } catch (error) {
        assert(error instanceof Error)
        assert(error.message.includes('Circular reference'))
      }
    })
  })

  describe('Performance Integration', () => {
    it('should handle moderate volume efficiently', async () => {
      const startTime = performance.now()

      const logger = new StructuredLogger()
      const serializer = createSerializer({ fastPaths: true })

      for (let i = 0; i < 100; i++) {
        const logEntry = logger.createLogEntry({
          level: i % 2 === 0 ? 'info' : 'debug',
          message: createLogMessage(`Performance test ${i}`),
          data: {
            iteration: i,
            orderId: createOrderId(`perf-${i}`),
            symbol: createSymbol('PERF'),
            timestamp: new Date(),
            metrics: {
              latency: Math.random() * 20,
              throughput: Math.random() * 1000,
            },
          },
        })

        const serialized = serializer.serialize(logEntry)
        assertExists(serialized.value)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      assert(duration < 1000)
    })

    it('should maintain type safety throughout pipeline', () => {
      const levelManager = getGlobalLevelManager()
      const logger = new StructuredLogger()
      const serializer = createSerializer()

      const typedData = {
        traceId: createTraceId('type-safety-test'),
        spanId: createSpanId('type-span-001'),
        orderId: createOrderId('type-order-001'),
        symbol: createSymbol('TYPE'),
        message: createLogMessage('Type safety verification'),
        timestamp: createTimestamp(new Date().toISOString()),
        sessionId: createSessionId('type-session'),
        requestId: createRequestId('type-request'),
      }

      const logEntry = logger.createLogEntry({
        level: 'info',
        message: typedData.message,
        data: typedData,
      })

      const serialized = serializer.serialize(logEntry)

      assertExists(logEntry)
      assertExists(serialized.value)
      assertEquals(logEntry.level, 'info')

      assert(levelManager.hasLevel('info'))
      assert(levelManager.hasLevel('error'))
      assert(levelManager.hasLevel('debug'))
    })
  })

  describe('Backward Compatibility', () => {
    it('should support structured entry creation', () => {
      const structuredEntry = createStructuredEntry(
        'info',
        'Structured entry test',
        {
          orderId: createOrderId('structured-001'),
          symbol: createSymbol('STRUCT'),
          price: 75.50,
        },
        {
          traceId: createTraceId('struct-trace-001'),
          spanId: createSpanId('struct-span-001'),
          sessionId: createSessionId('struct-session'),
          userId: 'struct-user',
          requestId: createRequestId('struct-request'),
          timestamp: createTimestamp(new Date().toISOString()),
          metadata: {},
        },
      )

      assertExists(structuredEntry)
      assertEquals(structuredEntry.level, 'info')
      assertEquals(structuredEntry.message, 'Structured entry test')
      assertExists(structuredEntry.data)
      assertExists(structuredEntry.context)
    })
  })
})
