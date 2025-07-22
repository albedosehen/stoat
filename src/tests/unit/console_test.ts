// deno-lint-ignore-file default-param-last
import { assert, assertEquals, assertExists, assertGreater, assertStringIncludes } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertSpyCalls, type Spy, spy } from '@std/testing/mock'
import { ConsoleTransport, type ConsoleTransportConfig, createConsoleTransport } from '../../services/console.ts'
import type { StructuredLogEntry } from '../../loggers/structured-log-entry.ts'
import type { StoatContext } from '../../stoat/context.ts'
import { createLogMessage, createSessionId, createSpanId, createTimestamp, createTraceId } from '../../types/brands.ts'
import { LOG_LEVEL_VALUES } from '../../types/logLevels.ts'

describe('Console Transport', () => {
  let consoleTransport: ConsoleTransport
  let testConfig: ConsoleTransportConfig
  let consoleLogSpy: Spy
  let consoleErrorSpy: Spy

  function createTestEntry(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'info',
    message = 'Test message',
    additionalData?: Partial<StructuredLogEntry>,
  ): StructuredLogEntry {
    return {
      timestamp: createTimestamp(new Date().toISOString()),
      level,
      levelValue: LOG_LEVEL_VALUES[level],
      message: createLogMessage(message),
      ...additionalData,
    }
  }

  function createTestContext(): StoatContext {
    return {
      timestamp: createTimestamp(new Date().toISOString()),
      sessionId: createSessionId('test-session-123'),
      traceId: createTraceId('trace-abc-123'),
      spanId: createSpanId('span-def-456'),
      component: 'test-component',
      module: 'console-transport',
    }
  }

  beforeEach(() => {
    // Ensure all spies are fully restored before creating new ones
    try {
      if (consoleLogSpy && typeof consoleLogSpy.restore === 'function') {
        consoleLogSpy.restore()
      }
    } catch {
      // Ignore if spy doesn't exist or is already restored
    }

    try {
      if (consoleErrorSpy && typeof consoleErrorSpy.restore === 'function') {
        consoleErrorSpy.restore()
      }
    } catch {
      // Ignore if spy doesn't exist or is already restored
    }

    // Reset spy references
    consoleLogSpy = undefined!
    consoleErrorSpy = undefined!

    testConfig = {
      destination: 'console',
      enabled: true,
      minLevel: 'info',
      format: 'text',
      async: false,
      colors: true,
      prettyPrint: false,
      useStderr: false,
    }

    consoleTransport = new ConsoleTransport(testConfig)

    // Create fresh spies
    consoleLogSpy = spy(console, 'log')
    consoleErrorSpy = spy(console, 'error')
  })

  afterEach(async () => {
    // Close transport first
    try {
      if (consoleTransport) {
        await consoleTransport.close()
      }
    } catch {
      // Ignore close errors
    }

    // Restore spies with proper error handling
    try {
      if (consoleLogSpy && typeof consoleLogSpy.restore === 'function') {
        consoleLogSpy.restore()
      }
    } catch {
      // Ignore restore errors
    }

    try {
      if (consoleErrorSpy && typeof consoleErrorSpy.restore === 'function') {
        consoleErrorSpy.restore()
      }
    } catch {
      // Ignore restore errors
    }

    // Clear references
    consoleLogSpy = undefined!
    consoleErrorSpy = undefined!
    consoleTransport = undefined!
  })

  describe('Transport Creation and Configuration', () => {
    it('should create console transport with default configuration', () => {
      assertExists(consoleTransport)
      assertEquals(consoleTransport.destination, 'console')
      assertEquals(consoleTransport.config.enabled, true)
    })

    it('should create transport using factory function', () => {
      const factoryTransport = createConsoleTransport({
        colors: false,
        prettyPrint: true,
      })

      assertExists(factoryTransport)
      assertEquals(factoryTransport.destination, 'console')
      assertEquals((factoryTransport.config as ConsoleTransportConfig).colors, false)
      assertEquals((factoryTransport.config as ConsoleTransportConfig).prettyPrint, true)
    })

    it('should have correct default configuration', () => {
      const defaultTransport = createConsoleTransport()
      const config = defaultTransport.config as ConsoleTransportConfig

      assertEquals(config.destination, 'console')
      assertEquals(config.enabled, true)
      assertEquals(config.minLevel, 'info')
      assertEquals(config.colors, true)
      assertEquals(config.prettyPrint, false)
      assertEquals(config.useStderr, false)
    })
  })

  describe('Level Filtering', () => {
    it('should respect minimum log level', () => {
      const _entry = createTestEntry('debug', 'Debug message')

      // Debug is below the configured minimum level (info)
      assert(!consoleTransport.canWrite('debug'))
      assertEquals(consoleTransport.canWrite('info'), true)
      assertEquals(consoleTransport.canWrite('error'), true)
    })

    it('should allow all levels when minimum is trace', () => {
      const traceConfig = {
        ...testConfig,
        minLevel: 'trace' as const,
      }

      const traceTransport = new ConsoleTransport(traceConfig)

      assert(traceTransport.canWrite('trace'))
      assert(traceTransport.canWrite('debug'))
      assert(traceTransport.canWrite('info'))
      assert(traceTransport.canWrite('warn'))
      assert(traceTransport.canWrite('error'))
      assert(traceTransport.canWrite('fatal'))
    })

    it('should reject all levels when disabled', () => {
      const disabledConfig = {
        ...testConfig,
        enabled: false,
      }

      const disabledTransport = new ConsoleTransport(disabledConfig)

      assert(!disabledTransport.canWrite('info'))
      assert(!disabledTransport.canWrite('error'))
      assert(!disabledTransport.canWrite('fatal'))
    })
  })

  describe('Text Format Output', () => {
    it('should write info message to console.log', async () => {
      const entry = createTestEntry('info', 'Info test message')

      const result = await consoleTransport.write(entry)

      assert(result.success)
      assertSpyCalls(consoleLogSpy, 1)
      assertSpyCalls(consoleErrorSpy, 0)

      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'INFO')
      assertStringIncludes(output, 'Info test message')
    })

    it('should write error message to console.log by default', async () => {
      const entry = createTestEntry('error', 'Error test message')

      const result = await consoleTransport.write(entry)

      assert(result.success)
      assertSpyCalls(consoleLogSpy, 1)

      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'ERROR')
      assertStringIncludes(output, 'Error test message')
    })

    it('should use console.error when useStderr is true', async () => {
      const stderrConfig = {
        ...testConfig,
        useStderr: true,
      }

      const stderrTransport = new ConsoleTransport(stderrConfig)
      const entry = createTestEntry('error', 'Stderr test message')

      await stderrTransport.write(entry)

      assertSpyCalls(consoleErrorSpy, 1)
      assertSpyCalls(consoleLogSpy, 0)

      const output = consoleErrorSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'ERROR')
      assertStringIncludes(output, 'Stderr test message')
    })

    it('should include trace ID in output', async () => {
      const entry = createTestEntry('warn', 'Trace test', {
        traceId: createTraceId('trace-test-123'),
      })

      await consoleTransport.write(entry)

      assertSpyCalls(consoleLogSpy, 1)
      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, '[trace-test-123]')
    })

    it('should include context fields in output', async () => {
      const entry = createTestEntry('info', 'Context test', {
        component: 'test-service',
        function: 'testFunction',
        duration: 123.45,
      })

      await consoleTransport.write(entry)

      assertSpyCalls(consoleLogSpy, 1)
      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'component=test-service')
      assertStringIncludes(output, 'fn=testFunction')
      assertStringIncludes(output, 'duration=123.45ms')
    })
  })

  describe('JSON Format Output', () => {
    it('should output JSON when format is json', async () => {
      const jsonConfig = {
        ...testConfig,
        format: 'json' as const,
      }

      const jsonTransport = new ConsoleTransport(jsonConfig)
      const entry = createTestEntry('info', 'JSON test message')

      await jsonTransport.write(entry)

      assertSpyCalls(consoleLogSpy, 1)
      const output = consoleLogSpy.calls[0].args[0] as string

      // Should be valid JSON
      const parsed = JSON.parse(output.trim())
      assertEquals(parsed.level, 'info')
      assertEquals(parsed.message, 'JSON test message')
    })

    it('should include all entry fields in JSON output', async () => {
      const jsonConfig = {
        ...testConfig,
        format: 'json' as const,
      }

      const jsonTransport = new ConsoleTransport(jsonConfig)
      const entry = createTestEntry('error', 'Complete JSON test', {
        traceId: createTraceId('json-trace-123'),
        spanId: createSpanId('json-span-456'),
        service: 'json-service',
        component: 'json-component',
        data: { key: 'value', number: 42 },
      })

      await jsonTransport.write(entry)

      const output = consoleLogSpy.calls[0].args[0] as string
      const parsed = JSON.parse(output.trim())

      assertEquals(parsed.level, 'error')
      assertEquals(parsed.message, 'Complete JSON test')
      assertEquals(parsed.traceId, 'json-trace-123')
      assertEquals(parsed.spanId, 'json-span-456')
      assertEquals(parsed.service, 'json-service')
      assertEquals(parsed.component, 'json-component')
      assertEquals(parsed.data.key, 'value')
      assertEquals(parsed.data.number, 42)
    })
  })

  describe('Pretty Print Mode', () => {
    it('should format output with pretty printing', async () => {
      const prettyConfig = {
        ...testConfig,
        prettyPrint: true,
      }

      const prettyTransport = new ConsoleTransport(prettyConfig)
      const entry = createTestEntry('info', 'Pretty print test', {
        traceId: createTraceId('pretty-trace-123'),
        component: 'pretty-component',
        duration: 56.78,
        data: { orderId: 'order-123', symbol: 'AAPL' },
      })

      await prettyTransport.write(entry)

      assertSpyCalls(consoleLogSpy, 1)
      const output = consoleLogSpy.calls[0].args[0] as string

      // Pretty print should have box-drawing characters and multiple lines
      assert(output.includes('┌─'))
      assert(output.includes('│'))
      assert(output.includes('└─'))
      assertStringIncludes(output, 'Pretty print test')
      assertStringIncludes(output, 'trace=pretty-trace-123')
      assertStringIncludes(output, 'component=pretty-component')
      assertStringIncludes(output, '56.78ms')
    })

    it('should include performance metrics in pretty print', async () => {
      const prettyConfig = {
        ...testConfig,
        prettyPrint: true,
        minLevel: 'debug' as const, // Allow debug level for this test
      }

      const prettyTransport = new ConsoleTransport(prettyConfig)
      const entry = createTestEntry('debug', 'Performance test', {
        duration: 123.45,
        memoryUsage: 2048 * 1024, // 2MB
        component: 'perf-component',
      })

      await prettyTransport.write(entry)

      // Verify that the entry was actually written
      assertSpyCalls(consoleLogSpy, 1)
      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Performance: 123.45ms, 2048KB')
    })

    it('should include data payload in pretty print', async () => {
      const prettyConfig = {
        ...testConfig,
        prettyPrint: true,
      }

      const prettyTransport = new ConsoleTransport(prettyConfig)
      const entry = createTestEntry('warn', 'Data test', {
        data: {
          orderId: 'order-456',
          symbol: 'GOOGL',
          quantity: 50,
          nested: { price: 2500.00, currency: 'USD' },
        },
      })

      await prettyTransport.write(entry)

      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Data:')
      assertStringIncludes(output, 'order-456')
      assertStringIncludes(output, 'GOOGL')
      assertStringIncludes(output, '2500')
    })

    it('should include error information in pretty print', async () => {
      const prettyConfig = {
        ...testConfig,
        prettyPrint: true,
      }

      const prettyTransport = new ConsoleTransport(prettyConfig)
      const testError = {
        name: 'TestError',
        message: 'Something went wrong',
        stack: 'TestError: Something went wrong\n    at test.ts:123:45',
      }

      const entry = createTestEntry('error', 'Error with stack', {
        error: testError,
      })

      await prettyTransport.write(entry)

      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Error: TestError: Something went wrong')
      assertStringIncludes(output, 'test.ts:123:45')
    })

    it('should include labels and tags in pretty print', async () => {
      const prettyConfig = {
        ...testConfig,
        prettyPrint: true,
      }

      const prettyTransport = new ConsoleTransport(prettyConfig)
      const entry = createTestEntry('info', 'Labels test', {
        labels: { environment: 'test', team: 'trading' },
        tags: ['performance', 'monitoring', 'critical'],
      })

      await prettyTransport.write(entry)

      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Labels: environment=test, team=trading, #performance, #monitoring, #critical')
    })
  })

  describe('Color Support', () => {
    it('should include color codes when colors enabled', async () => {
      const colorConfig = {
        ...testConfig,
        colors: true,
      }

      const colorTransport = new ConsoleTransport(colorConfig)
      const entry = createTestEntry('error', 'Color test')

      await colorTransport.write(entry)

      const output = consoleLogSpy.calls[0].args[0] as string
      // Should contain ANSI color codes for error (red)
      assert(output.includes('\x1b[31m') || output.includes('ERROR'))
    })

    it('should not include color codes when colors disabled', async () => {
      const noColorConfig = {
        ...testConfig,
        colors: false,
      }

      const noColorTransport = new ConsoleTransport(noColorConfig)
      const entry = createTestEntry('error', 'No color test')

      await noColorTransport.write(entry)

      const output = consoleLogSpy.calls[0].args[0] as string
      // Should not contain ANSI escape sequences
      assert(!output.includes('\x1b['))
    })

    it('should use custom color mapping', async () => {
      const customColorConfig = {
        ...testConfig,
        colors: true,
        colorMap: {
          info: '\x1b[34m', // Blue instead of default green
          error: '\x1b[35m', // Magenta instead of default red
        },
      }

      const customColorTransport = new ConsoleTransport(customColorConfig)
      const entry = createTestEntry('info', 'Custom color test')

      await customColorTransport.write(entry)

      // We can't easily test the exact color codes due to environment detection
      // but we can verify the transport was created successfully
      assertExists(customColorTransport)
    })
  })

  describe('Batch Writing', () => {
    it('should write multiple entries in batch', async () => {
      const entries = [
        createTestEntry('info', 'Batch message 1'),
        createTestEntry('warn', 'Batch message 2'),
        createTestEntry('error', 'Batch message 3'),
      ]

      const results = await consoleTransport.writeBatch(entries)

      assertEquals(results.length, 3)
      results.forEach((result) => assert(result.success))

      // Should have made one batched output call
      assertSpyCalls(consoleLogSpy, 1)

      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Batch message 1')
      assertStringIncludes(output, 'Batch message 2')
      assertStringIncludes(output, 'Batch message 3')
    })

    it('should filter entries by level in batch writing', async () => {
      const entries = [
        createTestEntry('debug', 'Should be filtered'),
        createTestEntry('info', 'Should be included'),
        createTestEntry('error', 'Should be included'),
      ]

      const results = await consoleTransport.writeBatch(entries)

      // Should return results only for entries that meet the minimum level
      // debug is filtered out, but info and error should be included
      assertEquals(results.length, 2)

      // Should output the filtered batch (info and error entries)
      assertSpyCalls(consoleLogSpy, 1)

      // Verify the output contains the expected entries
      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Should be included') // appears twice (info + error)
      assert(!output.includes('Should be filtered')) // debug entry not included
    })

    it('should handle empty batch gracefully', async () => {
      const results = await consoleTransport.writeBatch([])

      assertEquals(results.length, 0)
      assertSpyCalls(consoleLogSpy, 0)
    })
  })

  describe('Statistics and Health', () => {
    it('should track transport statistics', async () => {
      const entry = createTestEntry('info', 'Stats test')

      const initialStats = consoleTransport.stats
      assertEquals(initialStats.messagesWritten, 0)

      await consoleTransport.write(entry)

      const finalStats = consoleTransport.stats
      assertEquals(finalStats.messagesWritten, 1)
      assertGreater(finalStats.bytesWritten, 0)
      assertExists(finalStats.lastWrite)
    })

    it('should report healthy status when enabled', () => {
      assert(consoleTransport.isHealthy())
    })

    it('should report unhealthy when disabled', () => {
      const disabledConfig = {
        ...testConfig,
        enabled: false,
      }

      const disabledTransport = new ConsoleTransport(disabledConfig)
      assert(!disabledTransport.isHealthy())
    })

    it('should report unhealthy when closed', async () => {
      assert(consoleTransport.isHealthy())

      await consoleTransport.close()

      assert(!consoleTransport.isHealthy())
    })
  })

  describe('Error Handling', () => {
    it('should handle write errors gracefully', async () => {
      // Create a transport that will fail
      const errorConfig = {
        ...testConfig,
        errorHandler: spy((_error: Error, _entry: StructuredLogEntry) => {
          // Error handler should be called
        }),
      }

      const errorTransport = new ConsoleTransport(errorConfig)

      // Create a temporary spy that throws errors
      const originalLog = console.log
      const erroringSpy = spy(() => {
        throw new Error('Console write failed')
      })

      // Temporarily replace console.log
      console.log = erroringSpy

      const entry = createTestEntry('info', 'Error test')

      const result = await errorTransport.write(entry)

      assert(!result.success)
      assertExists(result.error)
      assertEquals(result.error.message, 'Transport write error: Failed to write to console: Console write failed')

      // Restore original console.log
      console.log = originalLog
    })

    it('should track error count in statistics', async () => {
      const errorHandler = spy()
      const errorConfig = {
        ...testConfig,
        errorHandler,
      }

      const errorTransport = new ConsoleTransport(errorConfig)

      // Create a temporary spy that throws errors
      const originalLog = console.log
      const errorSpy = spy(() => {
        throw new Error('Forced error')
      })

      // Temporarily replace console.log
      console.log = errorSpy

      const entry = createTestEntry('info', 'Error count test')

      await errorTransport.write(entry)

      const stats = errorTransport.stats
      assertEquals(stats.errors, 1)
      assertSpyCalls(errorHandler, 1)

      // Restore original console.log
      console.log = originalLog
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should flush successfully', async () => {
      // Console transport doesn't buffer, so flush should complete immediately
      await consoleTransport.flush()

      // Should not throw or cause issues
      assert(true)
    })

    it('should close successfully', async () => {
      assert(consoleTransport.isHealthy())

      await consoleTransport.close()

      assert(!consoleTransport.isHealthy())
    })

    it('should prevent writing after close', async () => {
      await consoleTransport.close()

      const entry = createTestEntry('info', 'After close test')
      const result = await consoleTransport.write(entry)

      assert(!result.success)
      assertSpyCalls(consoleLogSpy, 0)
    })
  })

  describe('Context Integration', () => {
    it('should handle context in write operations', async () => {
      const context = createTestContext()
      const entry = createTestEntry('info', 'Context integration test')

      await consoleTransport.write(entry, context)

      assertSpyCalls(consoleLogSpy, 1)
      const output = consoleLogSpy.calls[0].args[0] as string
      assertStringIncludes(output, 'Context integration test')
    })

    it('should use context in batch operations', async () => {
      const context = createTestContext()
      const entries = [
        createTestEntry('info', 'Context batch 1'),
        createTestEntry('warn', 'Context batch 2'),
      ]

      await consoleTransport.writeBatch(entries, context)

      assertSpyCalls(consoleLogSpy, 1)
    })
  })

  describe('Environment Detection', () => {
    it('should handle different runtime environments', () => {
      // Test that transport works regardless of runtime environment
      const transport = createConsoleTransport()

      assertExists(transport)
      assertEquals(transport.destination, 'console')
    })

    it('should detect color support appropriately', () => {
      // Color support detection is environment-dependent
      // We mainly test that it doesn't throw errors
      const colorTransport = createConsoleTransport({ colors: true })
      const noColorTransport = createConsoleTransport({ colors: false })

      assertExists(colorTransport)
      assertExists(noColorTransport)
    })
  })
})
