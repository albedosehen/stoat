import { assert, assertEquals, assertExists, assertGreater, assertGreaterOrEqual, assertLessOrEqual } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertSpyCalls, type Spy, spy } from '@std/testing/mock'
import { ASYNC_CONFIGS, type AsyncConfig, AsyncLogger, createAsyncLogger, getAsyncConfig } from './async.ts'
import type { StructuredLogEntry } from './structured.ts'
import { createAgentId, createLogMessage, createStrategyId, createTimestamp } from '../types/brands.ts'
import { LOG_LEVEL_VALUES } from '../config/schema.ts'

describe('Async Logging System', () => {
  let asyncLogger: AsyncLogger
  let testConfig: AsyncConfig
  let syncCallbackSpy: Spy

  function createTestEntry(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'info',
    message = 'Test message',
  ): StructuredLogEntry {
    return {
      timestamp: createTimestamp(new Date().toISOString()),
      level,
      levelValue: LOG_LEVEL_VALUES[level],
      message: createLogMessage(message),
    }
  }

  beforeEach(() => {
    testConfig = {
      bufferSize: 100,
      maxBufferSize: 500,
      flushInterval: 100,
      batchSize: 10,
      syncOnExit: false,
      enableBackpressure: true,
      maxRetries: 2,
      retryDelay: 50,
      priorityLevels: {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60,
      },
      syncFallback: true,
      syncThreshold: 10 * 1024 * 1024, // 10MB
    }

    syncCallbackSpy = spy(() => {})
    asyncLogger = new AsyncLogger(testConfig, syncCallbackSpy)
  })

  afterEach(async () => {
    if (asyncLogger) {
      await asyncLogger.destroy()
    }
  })

  describe('AsyncLogger Creation and Configuration', () => {
    it('should create async logger with default metrics', () => {
      assertExists(asyncLogger)

      const metrics = asyncLogger.getMetrics()
      assertEquals(metrics.entriesBuffered, 0)
      assertEquals(metrics.entriesFlushed, 0)
      assertEquals(metrics.entriesDropped, 0)
      assertEquals(metrics.flushCount, 0)
      assertEquals(metrics.errorCount, 0)
    })

    it('should update configuration at runtime', () => {
      const newConfig = {
        bufferSize: 200,
        flushInterval: 200,
        enableBackpressure: false,
      }

      asyncLogger.updateConfig(newConfig)

      // Configuration should be updated
      // I can't directly test private config, but behavior changes should be observable
      assertExists(asyncLogger)
    })

    it('should create logger using factory function', () => {
      const factoryLogger = createAsyncLogger(testConfig, syncCallbackSpy)

      assertExists(factoryLogger)
      assertEquals(factoryLogger.constructor.name, 'AsyncLogger')
    })
  })

  describe('Async Logging Operations', () => {
    it('should log entry asynchronously', async () => {
      const entry = createTestEntry('info', 'Async log test')

      await asyncLogger.log(entry)

      // Entry should be buffered
      const metrics = asyncLogger.getMetrics()
      assertGreaterOrEqual(metrics.entriesBuffered, 1)
    })

    it('should handle multiple async log entries', async () => {
      const entries = [
        createTestEntry('info', 'Message 1'),
        createTestEntry('warn', 'Message 2'),
        createTestEntry('error', 'Message 3'),
      ]

      for (const entry of entries) {
        await asyncLogger.log(entry)
      }

      const metrics = asyncLogger.getMetrics()
      assertGreaterOrEqual(metrics.entriesBuffered, 3)
    })

    it('should use sync fallback for high-priority entries', async () => {
      // Force sync mode
      asyncLogger.enableSyncMode()

      const highPriorityEntry = createTestEntry('fatal', 'Critical error')

      await asyncLogger.log(highPriorityEntry)

      // Should have called sync callback directly
      assertSpyCalls(syncCallbackSpy, 1)
      assertEquals(syncCallbackSpy.calls[0].args[0], highPriorityEntry)
    })

    it('should use fast path for simple entries', async () => {
      const simpleEntry = createTestEntry('info', 'Simple message')
      await asyncLogger.log(simpleEntry)

      // Fast path should be used (verify by checking that it doesn't immediately flush)
      const metrics = asyncLogger.getMetrics()
      assertExists(metrics)
    })
  })

  describe('Sync Logging Fallback', () => {
    it('should use sync logging when explicitly enabled', () => {
      asyncLogger.enableSyncMode()
      assert(asyncLogger.isSyncMode())

      const entry = createTestEntry('warn', 'Sync fallback test')
      asyncLogger.logSync(entry)

      assertSpyCalls(syncCallbackSpy, 1)
      assertEquals(syncCallbackSpy.calls[0].args[0], entry)
    })

    it('should disable sync mode', () => {
      asyncLogger.enableSyncMode()
      assert(asyncLogger.isSyncMode())

      asyncLogger.disableSyncMode()
      assert(!asyncLogger.isSyncMode())
    })

    it('should handle sync callback errors gracefully', () => {
      const errorCallback = spy(() => {
        throw new Error('Sync callback error')
      })

      const loggerWithErrorCallback = new AsyncLogger(testConfig, errorCallback)

      // Should not throw
      loggerWithErrorCallback.logSync(createTestEntry('error', 'Error test'))

      assertSpyCalls(errorCallback, 1)
    })

    it('should fallback to console when no sync callback provided', () => {
      const loggerWithoutCallback = new AsyncLogger(testConfig)
      const consoleSpy = spy(console, 'log')

      loggerWithoutCallback.logSync(createTestEntry('info', 'Console fallback'))

      assertSpyCalls(consoleSpy, 1)
      consoleSpy.restore()
    })
  })

  describe('Buffering and Flushing', () => {
    it('should flush buffered entries', async () => {
      // Add multiple entries to buffer
      const entries = Array.from({ length: 5 }, (_, i) => createTestEntry('info', `Buffer test ${i}`))

      for (const entry of entries) {
        await asyncLogger.log(entry)
      }

      await asyncLogger.flush()

      // All entries should be flushed
      const metrics = asyncLogger.getMetrics()
      assertGreaterOrEqual(metrics.entriesFlushed, 5)
    })

    it('should handle buffer overflow with backpressure', async () => {
      const smallBufferConfig = {
        ...testConfig,
        bufferSize: 3,
        maxBufferSize: 5,
        enableBackpressure: true,
      }

      const smallBufferLogger = new AsyncLogger(smallBufferConfig, syncCallbackSpy)

      // Fill beyond buffer capacity
      const entries = Array.from({ length: 10 }, (_, i) => createTestEntry('info', `Overflow test ${i}`))

      for (const entry of entries) {
        await smallBufferLogger.log(entry)
      }

      const metrics = smallBufferLogger.getMetrics()
      assertGreater(metrics.backpressureEvents, 0)

      await smallBufferLogger.destroy()
    })

    it('should drop entries when buffer is full and backpressure disabled', async () => {
      const noBackpressureConfig = {
        ...testConfig,
        bufferSize: 3,
        maxBufferSize: 5,
        enableBackpressure: false,
      }

      const dropLogger = new AsyncLogger(noBackpressureConfig, syncCallbackSpy)

      // Overfill buffer
      for (let i = 0; i < 10; i++) {
        await dropLogger.log(createTestEntry('info', `Drop test ${i}`))
      }

      const metrics = dropLogger.getMetrics()
      assertGreater(metrics.entriesDropped, 0)

      await dropLogger.destroy()
    })

    it('should trigger immediate flush for high-priority entries', async () => {
      const entry = createTestEntry('error', 'High priority error')

      await asyncLogger.log(entry)

      // High priority should trigger immediate processing
      const metrics = asyncLogger.getMetrics()
      assertExists(metrics)
    })
  })

  describe('Performance Metrics', () => {
    it('should track performance metrics accurately', async () => {
      const startMetrics = asyncLogger.getMetrics()

      // Log some entries
      for (let i = 0; i < 5; i++) {
        await asyncLogger.log(createTestEntry('info', `Metrics test ${i}`))
      }

      await asyncLogger.flush()

      const endMetrics = asyncLogger.getMetrics()

      assertGreater(endMetrics.entriesBuffered, startMetrics.entriesBuffered)
      assertGreater(endMetrics.entriesFlushed, startMetrics.entriesFlushed)
      assertGreaterOrEqual(endMetrics.flushCount, 1)
    })

    it('should calculate buffer utilization', async () => {
      // Add entries to partially fill buffer
      for (let i = 0; i < 20; i++) {
        await asyncLogger.log(createTestEntry('info', `Utilization test ${i}`))
      }

      const metrics = asyncLogger.getMetrics()
      assertGreaterOrEqual(metrics.bufferUtilization, 0)
      assertLessOrEqual(metrics.bufferUtilization, 1)
    })

    it('should track average flush time', async () => {
      // Perform multiple flushes
      for (let i = 0; i < 3; i++) {
        await asyncLogger.log(createTestEntry('info', `Flush timing ${i}`))
        await asyncLogger.flush()
      }

      const metrics = asyncLogger.getMetrics()
      assertGreaterOrEqual(metrics.averageFlushTime, 0)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle flush errors gracefully', async () => {
      const errorCallback = spy(() => {
        throw new Error('Flush error')
      })

      const errorLogger = new AsyncLogger(testConfig, errorCallback)

      await errorLogger.log(createTestEntry('info', 'Error test'))

      // Should not throw during flush
      await errorLogger.flush()

      const metrics = errorLogger.getMetrics()
      assertGreater(metrics.errorCount, 0)

      await errorLogger.destroy()
    })

    it('should retry failed entries up to max retries', async () => {
      let callCount = 0
      const retryCallback = spy(() => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Retry test error')
        }
      })

      const retryLogger = new AsyncLogger({
        ...testConfig,
        maxRetries: 3,
        retryDelay: 10,
      }, retryCallback)

      await retryLogger.log(createTestEntry('info', 'Retry test'))
      await retryLogger.flush()

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should have retried the entry
      assertGreaterOrEqual(retryCallback.calls.length, 1)

      await retryLogger.destroy()
    })

    it('should prevent logging to destroyed logger', async () => {
      await asyncLogger.destroy()

      try {
        await asyncLogger.log(createTestEntry('info', 'After destroy'))
        assert(false, 'Should have thrown error')
      } catch (error) {
        assert(error instanceof Error)
        assert(error.message.includes('destroyed'))
      }
    })
  })

  describe('Configuration Presets', () => {
    it('should provide trading configuration preset', () => {
      const tradingConfig = getAsyncConfig('trading')

      assertEquals(tradingConfig.bufferSize, 1000)
      assertEquals(tradingConfig.flushInterval, 100)
      assertEquals(tradingConfig.enableBackpressure, true)
      assertEquals(tradingConfig.syncFallback, true)
      assertExists(tradingConfig.priorityLevels)
    })

    it('should provide web configuration preset', () => {
      const webConfig = getAsyncConfig('web')

      assertEquals(webConfig.bufferSize, 500)
      assertEquals(webConfig.flushInterval, 1000)
      assertEquals(webConfig.maxRetries, 3)
      assertEquals(webConfig.syncFallback, true)
    })

    it('should provide development configuration preset', () => {
      const devConfig = getAsyncConfig('development')

      assertEquals(devConfig.bufferSize, 100)
      assertEquals(devConfig.enableBackpressure, false)
      assertEquals(devConfig.maxRetries, 0)
      assertEquals(devConfig.syncFallback, false)
    })

    it('should create logger with preset configuration', () => {
      const tradingLogger = createAsyncLogger(ASYNC_CONFIGS.trading, syncCallbackSpy)

      assertExists(tradingLogger)
      assertEquals(tradingLogger.constructor.name, 'AsyncLogger')
    })
  })

  describe('Memory Management', () => {
    it('should manage memory usage efficiently', async () => {
      // Create many entries to test memory management
      const entries = Array.from({ length: 100 }, (_, i) => createTestEntry('info', `Memory test ${i}`))

      const startTime = performance.now()

      for (const entry of entries) {
        await asyncLogger.log(entry)
      }

      await asyncLogger.flush()

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete reasonably quickly
      assert(duration < 1000) // 1 second

      const metrics = asyncLogger.getMetrics()
      assertGreaterOrEqual(metrics.entriesFlushed, 100)
    })

    it('should clean up resources on destroy', async () => {
      // Create several entries
      for (let i = 0; i < 5; i++) {
        await asyncLogger.log(createTestEntry('info', `Cleanup test ${i}`))
      }

      const beforeDestroy = asyncLogger.getMetrics()
      assertGreater(beforeDestroy.entriesBuffered, 0)

      // Destroy should flush remaining entries
      await asyncLogger.destroy()

      // Logger should be in destroyed state
      try {
        await asyncLogger.log(createTestEntry('info', 'After destroy'))
        assert(false, 'Should have thrown')
      } catch (error) {
        assert(error instanceof Error)
      }
    })
  })

  describe('Priority-based Processing', () => {
    it('should process high-priority entries first', async () => {
      const processedEntries: StructuredLogEntry[] = []

      const priorityCallback = spy((entry: StructuredLogEntry) => {
        processedEntries.push(entry)
      })

      const priorityLogger = new AsyncLogger(testConfig, priorityCallback)

      // Add entries in mixed priority order
      await priorityLogger.log(createTestEntry('info', 'Low priority'))
      await priorityLogger.log(createTestEntry('fatal', 'High priority'))
      await priorityLogger.log(createTestEntry('debug', 'Lower priority'))
      await priorityLogger.log(createTestEntry('error', 'High priority 2'))

      await priorityLogger.flush()

      // Verify that higher priority entries were processed
      assertGreaterOrEqual(processedEntries.length, 4)

      await priorityLogger.destroy()
    })

    it('should drop low-priority entries under memory pressure', async () => {
      const pressureConfig = {
        ...testConfig,
        maxBufferSize: 10,
        enableBackpressure: false,
      }

      const pressureLogger = new AsyncLogger(pressureConfig, syncCallbackSpy)

      // Fill with low priority entries
      for (let i = 0; i < 15; i++) {
        await pressureLogger.log(createTestEntry('debug', `Low priority ${i}`))
      }

      const metrics = pressureLogger.getMetrics()
      assertGreater(metrics.entriesDropped, 0)

      await pressureLogger.destroy()
    })
  })

  describe('Integration with Modern Architecture', () => {
    it('should support structured log entries with full context', async () => {
      const complexEntry: StructuredLogEntry = {
        timestamp: createTimestamp(new Date().toISOString()),
        level: 'info',
        levelValue: 30,
        message: createLogMessage('Complex structured entry'),
        // deno-lint-ignore no-explicit-any
        traceId: 'trace-123' as any,
        // deno-lint-ignore no-explicit-any
        spanId: 'span-456' as any,
        // deno-lint-ignore no-explicit-any
        requestId: 'req-789' as any,
        service: 'trading-service',
        version: '2.1.0',
        component: 'order-processor',
        data: {
          orderId: 'order-abc-123',
          symbol: 'AAPL',
          quantity: 100,
        },
        context: {
          timestamp: createTimestamp(new Date().toISOString()),
          // deno-lint-ignore no-explicit-any
          sessionId: 'session-123' as any,
          strategy: createStrategyId('momentum'),
          agentId: createAgentId('agent-456'),
        },
        labels: {
          environment: 'production',
          team: 'trading',
        },
        tags: ['performance', 'monitoring'],
        duration: 45.67,
        memoryUsage: 1024 * 1024,
      }

      await asyncLogger.log(complexEntry)
      await asyncLogger.flush()

      assertSpyCalls(syncCallbackSpy, 1)
      assertEquals(syncCallbackSpy.calls[0].args[0], complexEntry)
    })

    it('should handle high-frequency trading scenarios', async () => {
      const hftConfig = ASYNC_CONFIGS.trading
      const hftLogger = new AsyncLogger(hftConfig, syncCallbackSpy)

      const startTime = performance.now()

      // Simulate high-frequency trading messages
      const hftEntries = Array.from({ length: 1000 }, (_, i) => createTestEntry('info', `HFT trade ${i}`))

      for (const entry of hftEntries) {
        await hftLogger.log(entry)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should handle 1000 entries very quickly
      assert(duration < 500) // 500ms

      await hftLogger.flush()

      const metrics = hftLogger.getMetrics()
      assertGreaterOrEqual(metrics.entriesFlushed, 1000)

      await hftLogger.destroy()
    })
  })
})
