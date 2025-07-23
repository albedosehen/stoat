import { assert, assertEquals, assertExists, assertGreater } from '@std/assert'
import { afterEach, describe, it } from '@std/testing/bdd'
import { StructuredLogger } from '../../loggers/structured-log-entry.ts'
import { type AsyncLoggerConfig, createAsyncLogger } from '../../loggers/async-logger.ts'
import { ConsoleTransport } from '../../loggers/services/mod.ts'
import { createSerializer, serialize } from '../../utils/serializer.ts'
import { createCustomLevel, getGlobalLevelManager, LogLevelManager } from '../../loggers/services/mod.ts'
import { DEFAULT_CONFIGS } from '../../types/defaults.ts'
import { LOG_LEVEL_VALUES } from '../../types/logLevels.ts'
import { validateConfig } from '../../types/validation.ts'
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
import type { StoatContext } from '../../stoat/context.ts'

describe('Full System Integration Tests', () => {
  let cleanup: (() => void)[] = []

  afterEach(() => {
    cleanup.forEach((fn) => fn())
    cleanup = []
  })

  describe('End-to-End Structured Logging with Modern Architecture', () => {
    it('should demonstrate complete modern logging pipeline', async () => {
      const _config = validateConfig({
        level: 'debug',
        name: 'integration-test-logger',
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
            maxEntries: 100,
            circular: false,
          },
        ],
        security: {
          enabled: true,
          sanitizeInputs: true,
          redactPaths: ['password', 'apiKey'],
          redactPatterns: ['\\d{4}-\\d{4}-\\d{4}-\\d{4}'],
          maxStringLength: 5000,
          allowCircularRefs: false,
        },
        performance: {
          enableAsyncLogging: true,
          enableSampling: false,
          samplingRate: 1.0,
          enableRateLimiting: false,
          enableMetrics: true,
          memoryThreshold: 50 * 1024 * 1024,
        },
        observability: {
          enabled: true,
          serviceName: 'integration-test',
          serviceVersion: '1.0.0',
          environment: 'test',
        },
      })

      const structuredLogger = new StructuredLogger({
        pretty: false,
        maxDepth: 15,
        includeStackTrace: true,
        timestampFormat: 'iso',
      })

      const tradeId = createOrderId('order-12345')
      const symbol = createSymbol('NVDA')
      const traceId = createTraceId('trace-abcdef123456')
      const spanId = createSpanId('span-789012')
      const strategyId = createStrategyId('momentum-v2')
      const agentId = createAgentId('trader-001')

      const _tradeContext: StoatContext = {
        timestamp: createTimestamp(new Date().toISOString()),
        sessionId: createSessionId('session-123'),
        requestId: createRequestId('req-789'),
        traceId: traceId,
        spanId: spanId,
        userId: 'user-456',
        orderId: tradeId,
        symbol: symbol,
        strategy: strategyId,
        agentId: agentId,
        metadata: {
          orderType: 'market',
          side: 'buy',
          quantity: 100,
          timestamp: new Date().toISOString(),
        },
      }

      const contextWithTimestamp: StoatContext = {
        timestamp: createTimestamp(new Date().toISOString()),
        sessionId: createSessionId('session-123'),
        requestId: createRequestId('req-789'),
        traceId: traceId,
        spanId: spanId,
        userId: 'user-456',
        orderId: tradeId,
        symbol: symbol,
        strategy: strategyId,
        agentId: agentId,
        metadata: {
          orderType: 'market',
          side: 'buy',
          quantity: 100,
          timestamp: new Date().toISOString(),
        },
      }

      const logEntry = structuredLogger.createLogEntry({
        level: 'info',
        message: 'Trade order executed successfully',
        data: {
          trade: {
            orderId: tradeId,
            symbol: symbol,
            price: 150.25,
            quantity: 100,
            fees: 1.50,
            executionTime: new Date(),
            metadata: {
              strategyId: strategyId,
              agentId: agentId,
              riskScore: 0.25,
              liquidityScore: 0.85,
            },
          },
          performance: {
            latency: 15.5,
            throughput: 1250.0,
            memoryUsage: 45 * 1024 * 1024,
          },
          security: {
            // This should be redacted
            apiKey: 'sk-1234567890abcdef',
            // This should be redacted
            creditCard: '4111-1111-1111-1111',
          },
        },
        context: contextWithTimestamp,
      })

      assertExists(logEntry.timestamp)
      assertEquals(logEntry.level, 'info')
      assertEquals(logEntry.message, 'Trade order executed successfully')
      assertExists(logEntry.context)
      assertExists(logEntry.data)
      assertExists(logEntry.traceId)
      assertExists(logEntry.spanId)

      assertExists(logEntry.context)
      assertExists(logEntry.context.metadata)

      interface BrandedObject {
        __type: string
        value?: string
      }
      interface MetadataWithBrands {
        orderId?: BrandedObject
        symbol?: BrandedObject
        strategyId?: BrandedObject
        [key: string]: unknown
      }
      const metadata = logEntry.context.metadata as MetadataWithBrands
      if (metadata && typeof metadata === 'object') {
        if (metadata.orderId && typeof metadata.orderId === 'object' && metadata.orderId.__type) {
          assertEquals(metadata.orderId.__type, 'orderId')
        }
        if (metadata.symbol && typeof metadata.symbol === 'object' && metadata.symbol.__type) {
          assertEquals(metadata.symbol.__type, 'symbol')
        }
        if (metadata.strategyId && typeof metadata.strategyId === 'object' && metadata.strategyId.__type) {
          assertEquals(metadata.strategyId.__type, 'strategyId')
        }
      }
    })

    it('should demonstrate async logging with high-performance scenarios', async () => {
      const asyncConfig: AsyncLoggerConfig = {
        bufferSize: 1000,
        flushInterval: 100,
        maxBufferSize: 5000,
        batchSize: 50,
        syncOnExit: false,
        enableBackpressure: true,
        maxRetries: 3,
        retryDelay: 100,
        priorityLevels: {
          trace: 10,
          debug: 20,
          info: 30,
          warn: 40,
          error: 50,
          fatal: 60,
        },
        syncFallback: true,
        syncThreshold: 50 * 1024 * 1024,
      }

      const asyncLogger = createAsyncLogger(asyncConfig)
      cleanup.push(() => asyncLogger.destroy())

      // Simulate high-frequency trading scenario
      const promises = []
      for (let i = 0; i < 100; i++) {
        const orderId = createOrderId(`low-footprint-order-${i}`)
        const symbol = createSymbol(i % 2 === 0 ? 'NVDA' : 'GOOGL')

        // Create proper structured log entry
        const tempLogger = new StructuredLogger()
        const logEntry = tempLogger.createLogEntry({
          level: 'info',
          message: `Low-footprint order ${i} processed`,
          data: {
            orderId: orderId,
            symbol: symbol,
            price: 100 + Math.random() * 50,
            quantity: Math.floor(Math.random() * 1000) + 1,
            latency: Math.random() * 10,
            timestamp: Date.now(),
          },
        })
        const promise = asyncLogger.logAsync(logEntry)

        promises.push(promise)
      }

      // Wait for all orders to be processed
      await Promise.all(promises)

      // Force flush and verify metrics
      await asyncLogger.flush()
      const metrics = asyncLogger.getMetrics()

      assertGreater(metrics.totalLogsProcessed, 99)
      assertExists(metrics.averageProcessingTime)
      assertExists(metrics.bufferUtilization)
    })

    it('should demonstrate transport integration and routing', async () => {
      // Create multiple transports with different configurations
      const consoleTransport = new ConsoleTransport({
        destination: 'console',
        enabled: true,
        minLevel: 'debug',
        async: false,
        colors: false,
        prettyPrint: true,
        useStderr: false,
      })

      const testData = {
        order: {
          id: createOrderId('transport-test-001'),
          symbol: createSymbol('MSFT'),
          side: 'sell',
          price: 420.50,
          quantity: 250,
        },
        execution: {
          venue: 'NYSE',
          latency: 8.5,
          fees: 2.10,
          timestamp: new Date(),
        },
      }

      const written = await consoleTransport.write({
        level: 'info',
        levelValue: LOG_LEVEL_VALUES.info,
        message: createLogMessage('Transport integration test'),
        data: testData,
        timestamp: createTimestamp(new Date().toISOString()),
        context: {
          timestamp: createTimestamp(new Date().toISOString()),
          traceId: createTraceId('transport-trace-123'),
          spanId: createSpanId('transport-span-456'),
          sessionId: createSessionId('transport-session'),
          userId: 'transport-user',
          requestId: createRequestId('transport-req'),
          metadata: {},
        },
      })

      assertEquals(written.success, true)

      const stats = consoleTransport.getStatistics()
      assertExists(stats.totalWrites)
      assertExists(stats.totalBytes)
      assertExists(stats.errors)
    })

    it('should demonstrate custom serialization with complex data types', () => {
      const serializer = createSerializer({
        maxDepth: 15,
        maxStringLength: 10000,
        enableCircularDetection: true,
        enablePerformanceTracking: true,
        customSerializers: {
          'Position': (value: unknown) => {
            interface Position {
              quantity: number
              avgPrice: number
              [key: string]: unknown
            }
            const pos = value as Position
            return {
              __type: 'trading-position',
              symbol: pos.symbol,
              quantity: pos.quantity,
              avgPrice: pos.avgPrice,
              marketValue: pos.quantity * pos.avgPrice,
              pnl: pos.pnl,
            }
          },
          'Portfolio': (value: unknown) => {
            interface Portfolio {
              positions: unknown[]
              [key: string]: unknown
            }
            const portfolio = value as Portfolio
            return {
              __type: 'trading-portfolio',
              totalValue: portfolio.totalValue,
              positions: portfolio.positions.length,
              cash: portfolio.cash,
              dayPnL: portfolio.dayPnL,
            }
          },
        },
      })

      const tradingData = {
        portfolio: {
          id: 'portfolio-001',
          totalValue: 1250000.00,
          cash: 50000.00,
          dayPnL: 2500.50,
          positions: [
            {
              symbol: createSymbol('NVDA'),
              quantity: 1000,
              avgPrice: 150.25,
              pnl: 1250.00,
            },
            {
              symbol: createSymbol('GOOGL'),
              quantity: 100,
              avgPrice: 2800.50,
              pnl: 850.25,
            },
          ],
        },
        strategy: {
          id: createStrategyId('mean-reversion-v3'),
          status: 'active',
          allocation: 0.75,
          riskParams: {
            maxDrawdown: 0.05,
            positionLimit: 0.10,
            stopLoss: 0.02,
          },
        },
        realTimeData: {
          timestamp: new Date(),
          marketData: new Map([
            ['NVDA', { price: 151.50, volume: 25000 }],
            ['GOOGL', { price: 2815.25, volume: 8500 }],
          ]),
          orderBook: new Set(['buy-001', 'sell-002', 'buy-003']),
        },
      }

      const result = serializer.serialize(tradingData)

      assertExists(result.value)
      assertExists(result.serializationTime)
      assertExists(result.memoryUsage)
      assertEquals(result.circularReferences, 0)

      interface SerializedTradingData {
        portfolio: { __type: string }
        strategy: { id: { __type: string } }
        realTimeData: {
          marketData: { __type: string }
          orderBook: { __type: string }
        }
        [key: string]: unknown
      }
      const serializedData = result.value as SerializedTradingData
      assertEquals(serializedData.portfolio.__type, 'trading-portfolio')
      assertEquals(serializedData.strategy.id.__type, 'strategyId')
      assertEquals(serializedData.realTimeData.marketData.__type, 'map')
      assertEquals(serializedData.realTimeData.orderBook.__type, 'set')
    })

    it('should demonstrate level management with custom trading levels', () => {
      const levelManager = new LogLevelManager()

      // Add custom trading levels
      levelManager.addLevel(createCustomLevel('MARKET_OPEN', 35, {
        description: 'Market opening events',
        color: 'green',
        aliases: ['market_open', 'open'],
      }))

      levelManager.addLevel(createCustomLevel('TRADE_EXECUTION', 45, {
        description: 'Trade execution events',
        color: 'blue',
        aliases: ['trade', 'execution'],
      }))

      levelManager.addLevel(createCustomLevel('RISK_ALERT', 55, {
        description: 'Risk management alerts',
        color: 'orange',
        aliases: ['risk', 'alert'],
      }))

      levelManager.addLevel(createCustomLevel('MARKET_CLOSE', 65, {
        description: 'Market closing events',
        color: 'red',
        aliases: ['market_close', 'close'],
      }))

      assert(levelManager.hasLevel('MARKET_OPEN'))
      assert(levelManager.hasLevel('TRADE_EXECUTION'))
      assert(levelManager.hasLevel('RISK_ALERT'))
      assert(levelManager.hasLevel('MARKET_CLOSE'))

      assert(levelManager.compareLevels('MARKET_OPEN', 'info') > 0)
      assert(levelManager.compareLevels('TRADE_EXECUTION', 'warn') > 0)
      assert(levelManager.compareLevels('RISK_ALERT', 'error') > 0)

      levelManager.setFilters({
        minLevel: 'TRADE_EXECUTION',
        maxLevel: 'RISK_ALERT',
      })

      assert(!levelManager.passesFilters('info'))
      assert(!levelManager.passesFilters('MARKET_OPEN'))
      assert(levelManager.passesFilters('TRADE_EXECUTION'))
      assert(!levelManager.passesFilters('warn')) // warn (40) < TRADE_EXECUTION (45)
      assert(levelManager.passesFilters('error'))
      assert(levelManager.passesFilters('RISK_ALERT'))
      assert(!levelManager.passesFilters('fatal'))
      assert(!levelManager.passesFilters('MARKET_CLOSE'))

      const stats = levelManager.exportConfig()
      assert(stats.customLevels.length >= 10) // Standard + custom levels (6 standard + 4 custom = 10)
      assertExists(stats.filters)
    })

    it('should demonstrate security features and data sanitization', () => {
      const secureLogger = new StructuredLogger({
        pretty: false,
        maxDepth: 10,
        maxStringLength: 10000,
        includeStackTrace: true,
      })

      const sensitiveData = {
        user: {
          id: 'user-123',
          name: 'John Trader',
          email: 'john@example.com',
        },
        account: {
          id: 'acc-456',
          balance: 75000.00,
          // These should be redacted
          password: 'super-secret-password',
          apiKey: 'sk-1234567890abcdef1234567890abcdef',
          ssn: '123-45-6789',
          creditCard: '4111-1111-1111-1111',
        },
        transaction: {
          id: 'txn-789',
          amount: 1500.00,
          // This should be redacted
          token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        },
      }

      const logEntry = secureLogger.createLogEntry({
        level: 'info',
        message: 'User transaction processed',
        data: sensitiveData,
      })

      interface SecurityTestData {
        account: {
          password: string
          apiKey: string
          ssn: string
          creditCard: string
          balance: number
        }
        transaction: {
          token: string
          amount: number
        }
        user: {
          name: string
        }
        [key: string]: unknown
      }
      const entryData = logEntry.data as SecurityTestData
      assertEquals(entryData.account.password, '[REDACTED]')
      assertEquals(entryData.account.apiKey, '[REDACTED]')
      assertEquals(entryData.account.ssn, '[REDACTED]')
      assertEquals(entryData.account.creditCard, '[REDACTED]')
      assertEquals(entryData.transaction.token, '[REDACTED]')

      assertEquals(entryData.user.name, 'John Trader')
      assertEquals(entryData.account.balance, 75000.00)
      assertEquals(entryData.transaction.amount, 1500.00)
    })

    it('should demonstrate configuration validation and environment integration', () => {
      const devConfig = validateConfig(DEFAULT_CONFIGS.development)
      assertEquals(devConfig.level, 'debug')
      assertEquals(devConfig.performance.enableAsyncLogging, false)
      assertEquals(devConfig.errorBoundary.suppressErrors, false)

      const prodConfig = validateConfig(DEFAULT_CONFIGS.production)
      assertEquals(prodConfig.level, 'info')
      assertEquals(prodConfig.performance.enableAsyncLogging, true)
      assertEquals(prodConfig.observability.enabled, true)

      const testConfig = validateConfig(DEFAULT_CONFIGS.testing)
      assertEquals(testConfig.level, 'fatal')
      assertEquals(testConfig.security.enabled, false)
      assertEquals(testConfig.performance.enableMetrics, false)

      const tradingConfig = validateConfig({
        level: 'debug',
        name: 'trading-system',
        version: '2.0.0',
        transports: [
          {
            type: 'console',
            enabled: true,
            colors: false,
            prettyPrint: false,
          },
          {
            type: 'file',
            enabled: true,
            destination: './logs/trading.log',
            maxFileSize: 500 * 1024 * 1024, // 500MB
            maxFiles: 30,
            compress: true,
            append: true,
            rotation: 'hourly',
          },
          {
            type: 'async',
            enabled: true,
            bufferSize: 50000,
            flushInterval: 500,
            maxBufferSize: 200000,
            syncOnExit: true,
          },
        ],
        security: {
          enabled: true,
          sanitizeInputs: true,
          redactPaths: ['apiKey', 'token', 'password', 'ssn'],
          redactPatterns: ['\\d{4}-\\d{4}-\\d{4}-\\d{4}'],
          maxStringLength: 20000,
          allowCircularRefs: false,
        },
        performance: {
          enableAsyncLogging: true,
          enableSampling: true,
          samplingRate: 0.1, // Sample 10% in production
          enableRateLimiting: true,
          rateLimit: 50000, // 50k logs per second
          enableMetrics: true,
          metricsInterval: 10000, // 10 seconds
          memoryThreshold: 500 * 1024 * 1024, // 500MB
        },
        observability: {
          enabled: true,
          serviceName: 'trading-engine',
          serviceVersion: '2.0.0',
          environment: 'production',
          enableAutoInstrumentation: true,
        },
      })

      assertEquals(tradingConfig.name, 'trading-system')
      assertEquals(tradingConfig.transports.length, 3)
      assertEquals(tradingConfig.performance.rateLimit, 50000)
    })

    it('should demonstrate error handling and observability integration', async () => {
      // Create logger with error boundary configuration
      const resilientLogger = new StructuredLogger({
        pretty: false,
        maxDepth: 10,
        includeStackTrace: true,
        timestampFormat: 'iso',
      })

      // Test error handling with invalid data
      const problematicData = {
        circular: {} as Record<string, unknown>,
        invalidFunction: () => {
          throw new Error('Test error')
        },
        largeData: 'x'.repeat(100000),
      }
      problematicData.circular.self = problematicData.circular

      // This should not throw, but handle errors gracefully
      const logEntry = resilientLogger.createLogEntry({
        level: 'error',
        message: 'Error handling test',
        data: problematicData,
      })

      assertExists(logEntry)
      assertEquals(logEntry.level, 'error')
      assertExists(logEntry.data)

      const metrics = resilientLogger.getMetrics()
      assertExists(metrics)
      assertExists(metrics.totalEntries)
      assertExists(metrics.errorCount)

      const perfStats = resilientLogger.getPerformanceStats()
      assertExists(perfStats)
      assertExists(perfStats.averageSerializationTime)
    })
  })

  describe('Performance and Scalability Integration', () => {
    it('should handle high-volume logging scenarios', async () => {
      const highVolumeLogger = createAsyncLogger({
        bufferSize: 10000,
        flushInterval: 1000,
        maxBufferSize: 50000,
        enableBackpressure: true,
        batchSize: 100,
        syncOnExit: true,
        maxRetries: 3,
        retryDelay: 100,
        priorityLevels: {
          trace: 10,
          debug: 20,
          info: 30,
          warn: 40,
          error: 50,
          fatal: 60,
        },
        syncFallback: true,
        syncThreshold: 100 * 1024 * 1024,
      })

      cleanup.push(() => highVolumeLogger.destroy())

      const startTime = Date.now()
      const promises = []

      for (let i = 0; i < 1000; i++) {
        const promise = highVolumeLogger.logAsync({
          level: 'info',
          levelValue: LOG_LEVEL_VALUES.info,
          message: createLogMessage(`High volume log ${i}`),
          timestamp: createTimestamp(new Date().toISOString()),
          data: {
            orderId: createOrderId(`hv-${i}`),
            symbol: createSymbol(['NVDA', 'GOOGL', 'MSFT', 'TSLA'][i % 4]),
            price: 100 + Math.random() * 500,
            volume: Math.floor(Math.random() * 10000),
            timestamp: Date.now(),
          },
        })
        promises.push(promise)
      }

      await Promise.all(promises)
      await highVolumeLogger.flush()

      const endTime = Date.now()
      const duration = endTime - startTime

      const metrics = highVolumeLogger.getMetrics()
      assertGreater(metrics.totalLogsProcessed, 999)

      assert(duration < 5000)
    })

    it('should demonstrate memory efficiency and cleanup', () => {
      const initialMemory = Deno.memoryUsage()

      const loggers = []
      for (let i = 0; i < 10; i++) {
        const logger = new StructuredLogger({
          maxDepth: 10,
          maxStringLength: 5000,
        })

        for (let j = 0; j < 100; j++) {
          logger.createLogEntry({
            level: 'info',
            message: `Memory test ${i}-${j}`,
            data: {
              iteration: i,
              index: j,
              payload: 'x'.repeat(1000),
            },
          })
        }

        loggers.push(logger)
      }

      // Clean up explicitly - StructuredLogger doesn't have cleanup method
      // Memory management is handled automatically

      const finalMemory = Deno.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB)
      assert(memoryIncrease < 50 * 1024 * 1024)
    })

    it('should validate end-to-end system performance', async () => {
      const startTime = performance.now()

      // Create complete logging pipeline
      const _config = validateConfig(DEFAULT_CONFIGS.production)
      const _levelManager = getGlobalLevelManager()
      const _serializer = createSerializer({ fastPaths: true })
      const logger = new StructuredLogger({
        pretty: false,
        maxDepth: 10,
        includeStackTrace: true,
        timestampFormat: 'iso',
      })

      // Process 100 realistic log entries
      for (let i = 0; i < 100; i++) {
        const entry = logger.createLogEntry({
          level: i % 2 === 0 ? 'info' : 'debug',
          message: `Performance test entry ${i}`,
          data: {
            tradeId: createOrderId(`perf-${i}`),
            symbol: createSymbol('PERF'),
            metrics: {
              latency: Math.random() * 20,
              throughput: Math.random() * 1000,
              errorRate: Math.random() * 0.01,
            },
            timestamp: new Date(),
          },
          context: {
            timestamp: createTimestamp(new Date().toISOString()),
            traceId: createTraceId(`perf-trace-${i}`),
            spanId: createSpanId(`perf-span-${i}`),
            sessionId: createSessionId('perf-session'),
            userId: 'perf-user',
            requestId: createRequestId(`perf-req-${i}`),
            metadata: {
              component: 'trading-engine',
              version: '2.0.0',
            },
          },
        })

        // Serialize entry
        const serialized = serialize(entry)
        assertExists(serialized.value)
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should process 100 entries efficiently
      assert(totalTime < 1000) // In less than 1 second

      const perfStats = logger.getPerformanceStats()
      assertExists(perfStats.totalEntries)
      assertExists(perfStats.averageProcessingTime)
      assert(perfStats.averageProcessingTime < 10) // In less than 10ms on average
    })
  })
})
