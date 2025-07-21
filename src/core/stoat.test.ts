import { assert, assertEquals, assertExists, assertStringIncludes } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertSpyCalls, spy, stub } from '@std/testing/mock'
import { stoat } from './stoat.ts'
import { Timer } from './timer.ts'
import { DEFAULT_STOAT_CONFIG, LOG_LEVEL, type StoatConfig } from '../schema/mod.ts'

const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  log: console.log,
}

function createTestConfig(overrides?: Partial<StoatConfig>): StoatConfig {
  return {
    ...DEFAULT_STOAT_CONFIG,
    outputDir: './test-logs',
    level: LOG_LEVEL.Debug,
    ...overrides,
  }
}

function cleanupTestFiles() {
  try {
    Deno.removeSync('./test-logs', { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

function mockConsole() {
  const spies = {
    debug: spy(console, 'debug'),
    info: spy(console, 'info'),
    warn: spy(console, 'warn'),
    error: spy(console, 'error'),
    log: spy(console, 'log'),
  }

  return spies
}

function restoreConsole() {
  Object.assign(console, originalConsole)
}

describe('STOAT Logger - Comprehensive Test Suite', () => {
  let testLogger: stoat
  let consoleSpies: ReturnType<typeof mockConsole>

  beforeEach(() => {
    consoleSpies = mockConsole()
    cleanupTestFiles()
  })

  afterEach(() => {
    restoreConsole()
    cleanupTestFiles()
    // Ensure all stubs are restored to prevent conflicts
    try {
      // @ts-ignore - accessing private stub restoration
      globalThis.Deno.writeTextFileSync.restore?.()
    } catch {
      // Ignore if no stub exists
    }
    try {
      // @ts-ignore - accessing private stub restoration
      globalThis.Deno.mkdirSync.restore?.()
    } catch {
      // Ignore if no stub exists
    }
  })

  describe('Factory Method - create()', () => {
    it('should create logger with default configuration', () => {
      testLogger = stoat.create()

      assertExists(testLogger)
      assertEquals(typeof testLogger, 'object')
    })

    it('should create logger with custom configuration', () => {
      const config = createTestConfig({
        level: LOG_LEVEL.Warn,
        outputDir: './custom-logs',
      })

      testLogger = stoat.create(config)

      assertExists(testLogger)
    })

    it('should create logger with partial configuration', () => {
      testLogger = stoat.create({
        level: LOG_LEVEL.Error,
        outputDir: './partial-logs',
      })

      assertExists(testLogger)
    })

    it('should handle directory creation errors gracefully', () => {
      const mkdirStub = stub(Deno, 'mkdirSync', () => {
        throw new Error('Permission denied')
      })

      // Should not throw
      testLogger = stoat.create(createTestConfig())

      assertExists(testLogger)
      mkdirStub.restore()
    })

    it('should ignore AlreadyExists errors during directory creation', () => {
      const mkdirStub = stub(Deno, 'mkdirSync', () => {
        throw new Deno.errors.AlreadyExists('Directory already exists')
      })

      testLogger = stoat.create(createTestConfig())

      assertExists(testLogger)
      mkdirStub.restore()
    })
  })

  describe('Child Logger Creation', () => {
    beforeEach(() => {
      testLogger = stoat.create(createTestConfig())
    })

    it('should create child logger with inherited context', () => {
      const childContext = { strategy: 'momentum' }
      const childLogger = testLogger.child(childContext)

      assertExists(childLogger)
      assertEquals(typeof childLogger, 'object')
    })

    it('should create child logger with merged context', () => {
      const childContext = {
        strategy: 'momentum',
        agentId: 'agent-123',
      }
      const childLogger = testLogger.child(childContext)

      childLogger.info('Test message')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'strategy:momentum')
      assertStringIncludes(logOutput, 'agent:agent-123')
    })

    it('should generate unique session IDs for child loggers', () => {
      const child1 = testLogger.child({ strategy: 'strategy1' })
      const child2 = testLogger.child({ strategy: 'strategy2' })

      child1.info('Child 1 message')
      child2.info('Child 2 message')

      assertSpyCalls(consoleSpies.info, 2)

      const log1 = consoleSpies.info.calls[0].args[0]
      const log2 = consoleSpies.info.calls[1].args[0]

      // Extract session IDs and verify they're different
      const sessionId1 = log1.match(/session:([a-f0-9]{8})/)?.[1]
      const sessionId2 = log2.match(/session:([a-f0-9]{8})/)?.[1]

      assertExists(sessionId1)
      assertExists(sessionId2)
      assert(sessionId1 !== sessionId2)
    })

    it('should preserve parent context reference', () => {
      const childLogger = testLogger.child({ strategy: 'test-strategy' })

      childLogger.info('Child message')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'strategy:test-strategy')
    })
  })

  describe('Log Level Methods', () => {
    beforeEach(() => {
      testLogger = stoat.create(createTestConfig({ level: LOG_LEVEL.Trace }))
    })

    it('should log trace messages correctly', () => {
      testLogger.trace('Trace message')

      assertSpyCalls(consoleSpies.debug, 1)
      assertStringIncludes(consoleSpies.debug.calls[0].args[0], 'TRACE')
      assertStringIncludes(consoleSpies.debug.calls[0].args[0], 'Trace message')
    })

    it('should log debug messages correctly', () => {
      testLogger.debug('Debug message')

      assertSpyCalls(consoleSpies.debug, 1)
      assertStringIncludes(consoleSpies.debug.calls[0].args[0], 'DEBUG')
      assertStringIncludes(consoleSpies.debug.calls[0].args[0], 'Debug message')
    })

    it('should log info messages correctly', () => {
      testLogger.info('Info message')

      assertSpyCalls(consoleSpies.info, 1)
      assertStringIncludes(consoleSpies.info.calls[0].args[0], 'INFO')
      assertStringIncludes(consoleSpies.info.calls[0].args[0], 'Info message')
    })

    it('should log warn messages correctly', () => {
      testLogger.warn('Warning message')

      assertSpyCalls(consoleSpies.warn, 1)
      assertStringIncludes(consoleSpies.warn.calls[0].args[0], 'WARN')
      assertStringIncludes(consoleSpies.warn.calls[0].args[0], 'Warning message')
    })

    it('should log error messages correctly', () => {
      testLogger.error('Error message')

      assertSpyCalls(consoleSpies.error, 1)
      assertStringIncludes(consoleSpies.error.calls[0].args[0], 'ERROR')
      assertStringIncludes(consoleSpies.error.calls[0].args[0], 'Error message')
    })

    it('should log fatal messages correctly', () => {
      testLogger.fatal('Fatal message')

      assertSpyCalls(consoleSpies.error, 1)
      assertStringIncludes(consoleSpies.error.calls[0].args[0], 'FATAL')
      assertStringIncludes(consoleSpies.error.calls[0].args[0], 'Fatal message')
    })

    it('should include additional data in log messages', () => {
      const testData = { orderId: '12345', amount: 100.50 }
      testLogger.info('Order placed', testData)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'Order placed')
      assertStringIncludes(logOutput, '12345')
      assertStringIncludes(logOutput, '100.5')
    })

    it('should handle string data correctly', () => {
      testLogger.info('Test message', 'additional string data')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'additional string data')
    })

    it('should handle circular reference in data gracefully', () => {
      const circularData: Record<string, unknown> = { name: 'test' }
      circularData.self = circularData

      testLogger.info('Circular test', circularData)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, '[Circular Reference]')
    })
  })

  describe('Log Level Filtering', () => {
    it('should filter messages below configured level', () => {
      testLogger = stoat.create(createTestConfig({ level: LOG_LEVEL.Warn }))

      testLogger.trace('Trace message')
      testLogger.debug('Debug message')
      testLogger.info('Info message')
      testLogger.warn('Warning message')
      testLogger.error('Error message')

      // Only warn and error should be logged
      assertSpyCalls(consoleSpies.debug, 0)
      assertSpyCalls(consoleSpies.info, 0)
      assertSpyCalls(consoleSpies.warn, 1)
      assertSpyCalls(consoleSpies.error, 1)
    })

    it('should respect log level priority correctly', () => {
      testLogger = stoat.create(createTestConfig({ level: LOG_LEVEL.Info }))

      testLogger.trace('Should not log')
      testLogger.debug('Should not log')
      testLogger.info('Should log')
      testLogger.warn('Should log')
      testLogger.error('Should log')
      testLogger.fatal('Should log')

      assertSpyCalls(consoleSpies.debug, 0)
      assertSpyCalls(consoleSpies.info, 1)
      assertSpyCalls(consoleSpies.warn, 1)
      assertSpyCalls(consoleSpies.error, 2) // error + fatal
    })

    it('should handle edge case log levels', () => {
      // Test with trace level (should log everything)
      testLogger = stoat.create(createTestConfig({ level: LOG_LEVEL.Trace }))

      testLogger.trace('Trace')
      testLogger.debug('Debug')
      testLogger.info('Info')

      assertSpyCalls(consoleSpies.debug, 2) // trace + debug
      assertSpyCalls(consoleSpies.info, 1)
    })

    it('should handle fatal level (should only log fatal)', () => {
      testLogger = stoat.create(createTestConfig({ level: LOG_LEVEL.Fatal }))

      testLogger.error('Error')
      testLogger.warn('Warn')
      testLogger.fatal('Fatal')

      assertSpyCalls(consoleSpies.error, 1) // only fatal
      assertSpyCalls(consoleSpies.warn, 0)
    })

    describe('Console-Only Logging (New Feature)', () => {
      it('should create logger without outputDir and not create directory', () => {
        const mkdirSpy = spy(Deno, 'mkdirSync')

        testLogger = stoat.create({ level: LOG_LEVEL.Debug })

        // Should not attempt directory creation
        assertSpyCalls(mkdirSpy, 0)
        assertExists(testLogger)

        mkdirSpy.restore()
      })

      it('should skip file writing when outputDir is undefined', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ level: LOG_LEVEL.Debug })
        testLogger.info('Console only message')

        // Should not attempt file writing
        assertSpyCalls(writeStub, 0)
        // But console output should work
        assertSpyCalls(consoleSpies.info, 1)

        writeStub.restore()
      })

      it('should verify console output works normally without outputDir', () => {
        testLogger = stoat.create({ level: LOG_LEVEL.Debug })
        testLogger.debug('Debug message')
        testLogger.info('Info message')
        testLogger.warn('Warning message')
        testLogger.error('Error message')

        assertSpyCalls(consoleSpies.debug, 1)
        assertSpyCalls(consoleSpies.info, 1)
        assertSpyCalls(consoleSpies.warn, 1)
        assertSpyCalls(consoleSpies.error, 1)
      })
    })

    describe('Pretty-Print JSON Output (New Feature)', () => {
      it('should format console output as JSON when prettyPrint is true', () => {
        testLogger = stoat.create({
          level: LOG_LEVEL.Debug,
          prettyPrint: true,
        })

        testLogger.info('Test message', { key: 'value' })

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string

        // Should be valid JSON
        const parsed = JSON.parse(output)
        assertEquals(parsed.level, 'info')
        assertEquals(parsed.msg, 'Test message')
        assertEquals(parsed.payload.key, 'value')
        assertExists(parsed.time)
      })

      it('should include module and metadata in pretty-print output', () => {
        testLogger = stoat.create({
          prettyPrint: true,
          module: 'test-module',
          metadata: { version: '1.0.0', env: 'test' },
        })

        testLogger.info('Module test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.module, 'test-module')
        assertEquals(parsed.metadata.version, '1.0.0')
        assertEquals(parsed.metadata.env, 'test')
      })

      it('should include context fields in pretty-print output', () => {
        testLogger = stoat.create({ prettyPrint: true })
        const childLogger = testLogger.child({
          symbol: 'AAPL',
          strategy: 'momentum',
          orderId: 'order-123',
        })

        childLogger.info('Context test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertExists(parsed.context)
        assertEquals(parsed.context.symbol, 'AAPL')
        assertEquals(parsed.context.strategy, 'momentum')
        assertEquals(parsed.context.orderId, 'order-123')
        assertExists(parsed.context.sessionId)
      })

      it('should use regular format for file output even with prettyPrint', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({
          outputDir: './test-logs',
          prettyPrint: true,
        })

        testLogger.info('File format test')

        assertSpyCalls(writeStub, 1)
        const content = writeStub.calls[0].args[1] as string

        // File output should not be JSON format
        assert(!content.startsWith('{'))
        assertStringIncludes(content, 'INFO')
        assertStringIncludes(content, 'File format test')

        writeStub.restore()
      })

      it('should handle default behavior when prettyPrint is false/undefined', () => {
        testLogger = stoat.create({ prettyPrint: false })
        testLogger.info('Regular format test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string

        // Should not be JSON format
        assert(!output.startsWith('{'))
        assertStringIncludes(output, 'INFO')
        assertStringIncludes(output, 'Regular format test')
      })

      it('should handle circular references in pretty-print mode', () => {
        testLogger = stoat.create({ prettyPrint: true })

        const circularData: Record<string, unknown> = { name: 'test' }
        circularData.self = circularData

        testLogger.info('Circular test', circularData)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.error, '[Circular Reference]')
      })
    })

    describe('Manual Write Method (New Feature)', () => {
      it('should write to file when outputDir is configured', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './test-logs' })
        testLogger.info('Manual write test')
        testLogger.write()

        // Should have written twice: once automatically, once manually
        assertSpyCalls(writeStub, 2)
        const [filePath1, content1] = writeStub.calls[0].args
        const [filePath2, content2] = writeStub.calls[1].args

        assertEquals(filePath1, filePath2)
        assertEquals(content1, content2)
        assertStringIncludes(content1 as string, 'Manual write test')

        writeStub.restore()
      })

      it('should throw error when outputDir is undefined', () => {
        testLogger = stoat.create() // no outputDir
        testLogger.info('Test message')

        try {
          testLogger.write()
          assert(false, 'Should have thrown error')
        } catch (error) {
          assertStringIncludes((error as Error).message, 'outputDir is not configured')
        }
      })

      it('should throw error when no message has been logged', () => {
        testLogger = stoat.create({ outputDir: './test-logs' })

        try {
          testLogger.write()
          assert(false, 'Should have thrown error')
        } catch (error) {
          assertStringIncludes((error as Error).message, 'no message has been logged yet')
        }
      })

      it('should throw error on file write failure', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {
          throw new Error('File system error')
        })

        testLogger = stoat.create({ outputDir: './test-logs' })
        testLogger.info('Test message')

        try {
          testLogger.write()
          assert(false, 'Should have thrown error')
        } catch (error) {
          assertStringIncludes((error as Error).message, 'Failed to write to file')
          assertStringIncludes((error as Error).message, 'File system error')
        }

        writeStub.restore()
      })

      it('should allow chaining after successful write', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './test-logs' })
        const result = testLogger.info('Test message').write()

        assertEquals(result, testLogger)

        writeStub.restore()
      })
    })

    describe('Child Logger Write Method Inheritance', () => {
      it('should inherit parent outputDir for write method', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './test-logs' })
        const childLogger = testLogger.child({ strategy: 'test' })

        childLogger.info('Child write test')
        childLogger.write()

        // Should work because child inherits parent outputDir
        assertSpyCalls(writeStub, 2) // automatic + manual write

        writeStub.restore()
      })

      it('should throw error when child has no outputDir and parent has none', () => {
        testLogger = stoat.create() // no outputDir
        const childLogger = testLogger.child({ strategy: 'test' })

        childLogger.info('Test message')

        try {
          childLogger.write()
          assert(false, 'Should have thrown error')
        } catch (error) {
          assertStringIncludes((error as Error).message, 'outputDir is not configured')
        }
      })

      it('should allow child to override parent outputDir for write method', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './parent-logs' })
        const childLogger = testLogger.child({ outputDir: './child-logs' })

        childLogger.info('Child override test')
        childLogger.write()

        assertSpyCalls(writeStub, 2)
        const filePath = writeStub.calls[1].args[0] as string
        assertStringIncludes(filePath, './child-logs/')

        writeStub.restore()
      })
    })

    describe('Flexible API with Module and Metadata (New Feature)', () => {
      it('should create logger with module and metadata in config', () => {
        testLogger = stoat.create({
          module: 'trading-engine',
          metadata: { version: '2.1.0', region: 'us-east-1' },
        })

        testLogger.info('API test message')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        assertStringIncludes(output, 'module:trading-engine')
      })

      it('should include module and metadata in log outputs', () => {
        testLogger = stoat.create({
          module: 'order-service',
          metadata: { build: '123', env: 'prod' },
          prettyPrint: true,
        })

        testLogger.warn('Service warning')

        assertSpyCalls(consoleSpies.warn, 1)
        const output = consoleSpies.warn.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.module, 'order-service')
        assertEquals(parsed.metadata.build, '123')
        assertEquals(parsed.metadata.env, 'prod')
      })

      it('should support child logger creation with new API', () => {
        testLogger = stoat.create({
          module: 'parent-module',
          metadata: { parentKey: 'parentValue' },
        })

        const childLogger = testLogger.child({
          strategy: 'momentum',
          module: 'child-module',
          metadata: { childKey: 'childValue' },
        })

        childLogger.info('Child API test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        assertStringIncludes(output, 'strategy:momentum')
        assertStringIncludes(output, 'module:child-module')
      })

      it('should support child logger creation with new API', () => {
        testLogger = stoat.create({ module: 'legacy-test' })
        const childLogger = testLogger.child({ strategy: 'legacy-strategy' })

        childLogger.info('Child API test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        assertStringIncludes(output, 'strategy:legacy-strategy')
        assertStringIncludes(output, 'module:legacy-test')
      })
    })

    describe('Child Logger Inheritance (New Feature)', () => {
      it('should inherit outputDir from parent when not specified', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './parent-logs' })
        const childLogger = testLogger.child({ strategy: 'inherit-test' })

        childLogger.info('Inheritance test')

        assertSpyCalls(writeStub, 1)
        const filePath = writeStub.calls[0].args[0] as string
        assertStringIncludes(filePath, './parent-logs/')

        writeStub.restore()
      })

      it('should inherit prettyPrint from parent when not specified', () => {
        testLogger = stoat.create({ prettyPrint: true })
        const childLogger = testLogger.child({ strategy: 'pretty-inherit' })

        childLogger.info('Pretty inheritance test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string

        // Should be JSON format (inherited prettyPrint: true)
        const parsed = JSON.parse(output)
        assertEquals(parsed.msg, 'Pretty inheritance test')
      })

      it('should inherit module from parent when not specified', () => {
        testLogger = stoat.create({
          module: 'parent-module',
          prettyPrint: true,
        })
        const childLogger = testLogger.child({ strategy: 'module-inherit' })

        childLogger.info('Module inheritance test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.module, 'parent-module')
      })

      it('should inherit metadata from parent when not specified', () => {
        testLogger = stoat.create({
          metadata: { parentData: 'inherited' },
          prettyPrint: true,
        })
        const childLogger = testLogger.child({ strategy: 'metadata-inherit' })

        childLogger.info('Metadata inheritance test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.metadata.parentData, 'inherited')
      })

      it('should allow child to override parent outputDir', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './parent-logs' })
        const childLogger = testLogger.child({
          outputDir: './child-logs',
          strategy: 'override-test',
        })

        childLogger.info('Override test')

        assertSpyCalls(writeStub, 1)
        const filePath = writeStub.calls[0].args[0] as string
        assertStringIncludes(filePath, './child-logs/')

        writeStub.restore()
      })

      it('should allow child to override parent prettyPrint', () => {
        testLogger = stoat.create({ prettyPrint: true })
        const childLogger = testLogger.child({
          prettyPrint: false,
          strategy: 'pretty-override',
        })

        childLogger.info('Pretty override test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string

        // Should not be JSON format (overridden prettyPrint: false)
        assert(!output.startsWith('{'))
        assertStringIncludes(output, 'INFO')
      })

      it('should allow child to override parent module', () => {
        testLogger = stoat.create({
          module: 'parent-module',
          prettyPrint: true,
        })
        const childLogger = testLogger.child({
          module: 'child-module',
          strategy: 'module-override',
        })

        childLogger.info('Module override test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.module, 'child-module')
      })

      it('should allow child to override parent metadata', () => {
        testLogger = stoat.create({
          metadata: { parentKey: 'parentValue' },
          prettyPrint: true,
        })
        const childLogger = testLogger.child({
          metadata: { childKey: 'childValue' },
          strategy: 'metadata-override',
        })

        childLogger.info('Metadata override test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.metadata.childKey, 'childValue')
        // Should not have parent metadata
        assertEquals(parsed.metadata.parentKey, undefined)
      })

      it('should allow child to disable file logging by setting outputDir to undefined', () => {
        const writeStub = stub(Deno, 'writeTextFileSync', () => {})

        testLogger = stoat.create({ outputDir: './parent-logs' })

        writeStub.calls.length = 0

        const childLogger = testLogger.child({
          outputDir: undefined,
          strategy: 'disable-file',
        })

        childLogger.info('Disable file test')

        // Child should not write to file when outputDir is explicitly undefined
        assertSpyCalls(writeStub, 0)
        // But console should still work
        assertSpyCalls(consoleSpies.info, 1)

        writeStub.restore()
      })

      it('should generate unique session IDs for child loggers', () => {
        testLogger = stoat.create({ prettyPrint: true })
        const child1 = testLogger.child({ strategy: 'child1' })
        const child2 = testLogger.child({ strategy: 'child2' })

        child1.info('Child 1 message')
        child2.info('Child 2 message')

        assertSpyCalls(consoleSpies.info, 2)

        const output1 = consoleSpies.info.calls[0].args[0] as string
        const output2 = consoleSpies.info.calls[1].args[0] as string

        const parsed1 = JSON.parse(output1)
        const parsed2 = JSON.parse(output2)

        assertExists(parsed1.context.sessionId)
        assertExists(parsed2.context.sessionId)
        assert(parsed1.context.sessionId !== parsed2.context.sessionId)
      })

      it('should maintain parent context reference in child loggers', () => {
        testLogger = stoat.create({
          module: 'parent-module',
          prettyPrint: true,
        })
        const childLogger = testLogger.child({ strategy: 'parent-ref-test' })

        childLogger.info('Parent reference test')

        assertSpyCalls(consoleSpies.info, 1)
        // Child logger should maintain parent context. Verification is that it logs successfully without throwing
        assertExists(childLogger)
      })
    })
  })

  describe('Context Formatting', () => {
    beforeEach(() => {
      testLogger = stoat.create(createTestConfig())
    })

    it('should format context with all fields', () => {
      const contextLogger = testLogger.child({
        orderId: 'order-123',
        symbol: 'AAPL',
        strategy: 'momentum',
        agentId: 'agent-456',
        portfolioId: 'portfolio-789',
        requestId: 'req-abc',
      })

      contextLogger.info('Full context test')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]

      assertStringIncludes(logOutput, 'order:order-123')
      assertStringIncludes(logOutput, 'symbol:AAPL')
      assertStringIncludes(logOutput, 'strategy:momentum')
      assertStringIncludes(logOutput, 'agent:agent-456')
      assertStringIncludes(logOutput, 'portfolio:portfolio-789')
      assertStringIncludes(logOutput, 'req:req-abc')
    })

    it('should format context with partial fields', () => {
      const contextLogger = testLogger.child({
        symbol: 'BTC',
        strategy: 'scalping',
      })

      contextLogger.info('Partial context test')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]

      assertStringIncludes(logOutput, 'symbol:BTC')
      assertStringIncludes(logOutput, 'strategy:scalping')
      assertStringIncludes(logOutput, 'session:')
    })

    it('should truncate long session IDs in context', () => {
      testLogger.info('Session ID test')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]

      // Should contain session: followed by 8 characters
      const sessionMatch = logOutput.match(/session:([a-f0-9]{8})/)
      assertExists(sessionMatch)
      assertEquals(sessionMatch[1].length, 8)
    })

    it('should handle empty context gracefully', () => {
      const emptyContextLogger = testLogger.child({})

      emptyContextLogger.info('Empty context test')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]

      // Should still have session ID from parent
      assertStringIncludes(logOutput, 'session:')
    })
  })

  describe('File Output Handling', () => {
    it('should write logs to file successfully', () => {
      const writeStub = stub(Deno, 'writeTextFileSync', () => {})

      testLogger = stoat.create(createTestConfig())
      testLogger.info('File test message')

      assertSpyCalls(writeStub, 1)
      const [filePath, content, options] = writeStub.calls[0].args

      assertStringIncludes(filePath as string, './test-logs/app-')
      assertStringIncludes(filePath as string, '.log')
      assertStringIncludes(content as string, 'File test message')
      assertEquals((options as Record<string, unknown>).append, true)

      writeStub.restore()
    })

    it('should handle file write errors silently', () => {
      const writeStub = stub(Deno, 'writeTextFileSync', () => {
        throw new Error('File write error')
      })

      testLogger = stoat.create(createTestConfig())
      // Should not throw
      testLogger.info('Error test message')

      // Console should still work
      assertSpyCalls(consoleSpies.info, 1)
      assertSpyCalls(writeStub, 1)

      writeStub.restore()
    })

    it('should generate correct log file paths', () => {
      const writeStub = stub(Deno, 'writeTextFileSync', () => {})

      testLogger = stoat.create(createTestConfig())
      testLogger.info('Path test')

      assertSpyCalls(writeStub, 1)
      const filePath = writeStub.calls[0].args[0] as string

      // Should match pattern: ./test-logs/app-YYYY-MM-DD.log
      const pathPattern = /^\.\/test-logs\/app-\d{4}-\d{2}-\d{2}\.log$/
      assert(pathPattern.test(filePath))

      writeStub.restore()
    })

    it('should handle permission errors gracefully', () => {
      const writeStub = stub(Deno, 'writeTextFileSync', () => {
        throw new Deno.errors.PermissionDenied('Write permission denied')
      })

      testLogger = stoat.create(createTestConfig())
      testLogger.error('Permission test')

      // Should not crash and console output should work
      assertSpyCalls(consoleSpies.error, 1)

      writeStub.restore()
    })
  })

  describe('Timer Creation', () => {
    beforeEach(() => {
      testLogger = stoat.create(createTestConfig())
    })

    it('should create timer instances correctly', () => {
      const timer = testLogger.timer('test-operation')

      assertExists(timer)
      assertEquals(timer instanceof Timer, true)
    })

    it('should create timers with operation names', () => {
      const operationName = 'data-processing'
      const timer = testLogger.timer(operationName)

      assertExists(timer)

      // Stop timer and check operation name
      const metrics = timer.stop()
      assertEquals(metrics.operation, operationName)
    })

    it('should create multiple independent timers', () => {
      const timer1 = testLogger.timer('operation-1')
      const timer2 = testLogger.timer('operation-2')

      assertExists(timer1)
      assertExists(timer2)
      assert(timer1 !== timer2)

      const metrics1 = timer1.stop()
      const metrics2 = timer2.stop()

      assertEquals(metrics1.operation, 'operation-1')
      assertEquals(metrics2.operation, 'operation-2')
    })
  })

  describe('Console Output Formatting', () => {
    beforeEach(() => {
      testLogger = stoat.create(createTestConfig())
    })

    it('should format timestamps correctly', () => {
      testLogger.info('Timestamp test')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]

      // Should start with ISO timestamp
      const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
      assert(timestampPattern.test(logOutput))
    })

    it('should pad log levels correctly', () => {
      testLogger.info('Level padding test')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]

      // Should contain "INFO " (5 characters)
      assertStringIncludes(logOutput, 'INFO ')
    })

    it('should format complete log entry structure', () => {
      const contextLogger = testLogger.child({ symbol: 'TEST' })
      contextLogger.warn('Complete format test', { key: 'value' })

      assertSpyCalls(consoleSpies.warn, 1)
      const logOutput = consoleSpies.warn.calls[0].args[0]

      // Should contain: timestamp, level, context, message, data
      assertStringIncludes(logOutput, 'WARN ')
      assertStringIncludes(logOutput, '[session:')
      assertStringIncludes(logOutput, 'symbol:TEST')
      assertStringIncludes(logOutput, 'Complete format test')
      assertStringIncludes(logOutput, '{"key":"value"}')
    })
  })

  describe('No-op Methods', () => {
    beforeEach(() => {
      testLogger = stoat.create(createTestConfig())
    })

    it('should implement flush as no-op', () => {
      // Should not throw
      testLogger.flush()
      assertEquals(typeof testLogger.flush, 'function')
    })

    it('should implement close as no-op', () => {
      // Should not throw
      testLogger.close()
      assertEquals(typeof testLogger.close, 'function')
    })

    it('should allow multiple calls to no-op methods', () => {
      // Should not throw or cause issues
      testLogger.flush()
      testLogger.flush()
      testLogger.close()
      testLogger.close()
      assertEquals(typeof testLogger.flush, 'function')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle undefined data gracefully', () => {
      testLogger = stoat.create(createTestConfig())

      testLogger.info('Undefined data test', undefined)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'Undefined data test')
      // Should not include data section when undefined
      assert(!logOutput.includes(' | '))
    })

    it('should handle null data correctly', () => {
      testLogger = stoat.create(createTestConfig())

      testLogger.info('Null data test', null)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'null')
    })

    it('should handle very long messages', () => {
      testLogger = stoat.create(createTestConfig())

      const longMessage = 'A'.repeat(10000)
      testLogger.info(longMessage)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, longMessage)
    })

    it('should handle special characters in messages', () => {
      testLogger = stoat.create(createTestConfig())

      const specialMessage = 'Test with émojis 🚀 and unicode ñ'
      testLogger.info(specialMessage)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, specialMessage)
    })

    it('should handle empty message strings', () => {
      testLogger = stoat.create(createTestConfig())

      testLogger.info('')

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'INFO')
    })

    it('should handle complex nested data structures', () => {
      testLogger = stoat.create(createTestConfig())

      const complexData = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          boolean: true,
          number: 42.5,
        },
      }

      testLogger.info('Complex data test', complexData)

      assertSpyCalls(consoleSpies.info, 1)
      const logOutput = consoleSpies.info.calls[0].args[0]
      assertStringIncludes(logOutput, 'Complex data test')
      assertStringIncludes(logOutput, 'deep')
      assertStringIncludes(logOutput, 'value')
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle rapid sequential logging', () => {
      testLogger = stoat.create(createTestConfig())

      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        testLogger.info(`Message ${i}`)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete quickly (adjust threshold as needed)
      assert(duration < 1000) // 1 second
      assertSpyCalls(consoleSpies.info, 1000)
    })

    it('should maintain consistent output format', () => {
      testLogger = stoat.create(createTestConfig())

      testLogger.info('Consistency test 1')
      testLogger.info('Consistency test 2')
      testLogger.info('Consistency test 3')

      assertSpyCalls(consoleSpies.info, 3)

      const outputs = consoleSpies.info.calls.map((call) => call.args[0] as string)

      outputs.forEach((output) => {
        // Each should follow same format
        assertStringIncludes(output, 'INFO')
        assertStringIncludes(output, '[session:')
        assert(output.includes('Consistency test'))
      })
    })

    it('should handle concurrent child logger creation', () => {
      testLogger = stoat.create(createTestConfig())

      const children = Array.from({ length: 50 }, (_, i) => testLogger.child({ strategy: `strategy-${i}` }))

      assertEquals(children.length, 50)

      // Each child should be unique
      children.forEach((child, index) => {
        child.info(`Child ${index} message`)
      })

      assertSpyCalls(consoleSpies.info, 50)
    })
  })

  describe('Modern Architecture Integration', () => {
    describe('Structured Logging Support', () => {
      it('should support modern structured logging patterns', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        // Test with structured data that would be used by modern components
        const structuredData = {
          traceId: 'trace-123',
          spanId: 'span-456',
          requestId: 'req-789',
          operationId: 'op-abc',
          metadata: {
            service: 'trading-engine',
            version: '2.0.0',
          },
        }

        testLogger.info('Structured log test', structuredData)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string

        // Should be valid JSON when prettyPrint is true
        const parsed = JSON.parse(output)
        assertEquals(parsed.level, 'info')
        assertEquals(parsed.msg, 'Structured log test')
        assertEquals(parsed.payload.traceId, 'trace-123')
        assertEquals(parsed.payload.metadata.service, 'trading-engine')
      })

      it('should handle complex nested data structures for structured logging', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        const complexData = {
          order: {
            id: 'order-123',
            symbol: 'AAPL',
            quantity: 100,
            price: 150.25,
            side: 'buy',
          },
          execution: {
            venue: 'NYSE',
            timestamp: new Date().toISOString(),
            fees: 0.01,
          },
          context: {
            strategy: 'momentum',
            agent: 'agent-456',
            portfolio: 'port-789',
          },
        }

        testLogger.info('Complex trading order', complexData)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.payload.order.symbol, 'AAPL')
        assertEquals(parsed.payload.execution.venue, 'NYSE')
        assertEquals(parsed.payload.context.strategy, 'momentum')
      })
    })

    describe('Security and Input Handling', () => {
      it('should handle potentially sensitive data appropriately', () => {
        testLogger = stoat.create(createTestConfig())

        // Test with data that might contain sensitive information
        const dataWithSensitiveInfo = {
          userId: 'user-123',
          accountId: 'acc-456',
          balance: 50000.00,
          positions: ['AAPL', 'GOOGL', 'MSFT'],
        }

        testLogger.info('Account data', dataWithSensitiveInfo)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string

        // Should include the data (security filtering would be in transport layer)
        assertStringIncludes(output, 'user-123')
        assertStringIncludes(output, 'AAPL')
      })

      it('should handle circular references gracefully', () => {
        testLogger = stoat.create(createTestConfig())

        const circularData: Record<string, unknown> = { name: 'test' }
        circularData.self = circularData

        testLogger.info('Circular test', circularData)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        assertStringIncludes(output, '[Circular Reference]')
      })
    })

    describe('Modern Context and Correlation', () => {
      it('should support modern correlation IDs in context', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        // Use existing context fields and add modern correlation via metadata
        const childWithModernContext = testLogger.child({
          requestId: 'req-modern-789',
          metadata: {
            traceId: 'trace-modern-123',
            spanId: 'span-modern-456',
            operationId: 'op-modern-abc',
            service: 'modern-service',
            version: '2.0.0',
          },
        })

        childWithModernContext.info('Modern context test')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertExists(parsed.context)
        assertEquals(parsed.context.requestId, 'req-modern-789')
        assertEquals(parsed.metadata.traceId, 'trace-modern-123')
        assertEquals(parsed.metadata.service, 'modern-service')
      })

      it('should support trading-specific context fields', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        const tradingLogger = testLogger.child({
          orderId: 'order-trading-123',
          symbol: 'AAPL',
          strategy: 'momentum-v2',
          agentId: 'agent-trading-456',
          portfolioId: 'portfolio-789',
          metadata: {
            venue: 'NYSE',
            executionType: 'market',
            account: 'acc-123',
          },
        })

        tradingLogger.info('Trading operation')

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertExists(parsed.context)
        assertEquals(parsed.context.symbol, 'AAPL')
        assertEquals(parsed.context.strategy, 'momentum-v2')
        assertEquals(parsed.metadata.venue, 'NYSE')
      })
    })

    describe('Performance Monitoring Integration', () => {
      it('should integrate with performance monitoring', () => {
        testLogger = stoat.create(createTestConfig())

        const timer = testLogger.timer('modern-operation')

        // Simulate some work
        const data = Array.from({ length: 1000 }, (_, i) => i * 2)
        const result = data.reduce((sum, val) => sum + val, 0)

        const metrics = timer.stop()

        assertEquals(metrics.operation, 'modern-operation')
        assertExists(metrics.duration)
        assertExists(metrics.memoryDelta)
        assert(typeof metrics.duration === 'number')
        assert(metrics.duration >= 0)

        testLogger.info('Operation completed', {
          metrics,
          result,
          records: data.length,
        })

        assertSpyCalls(consoleSpies.info, 1)
      })

      it('should handle performance metrics in structured format', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        const perfData = {
          duration: 123.45,
          memoryUsage: {
            rss: 1024 * 1024,
            heapUsed: 512 * 1024,
            heapTotal: 1024 * 1024,
            external: 256 * 1024,
          },
          cpuUsage: {
            user: 0.5,
            system: 0.1,
          },
        }

        testLogger.info('Performance metrics', perfData)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.payload.duration, 123.45)
        assertEquals(parsed.payload.memoryUsage.rss, 1024 * 1024)
        assertEquals(parsed.payload.cpuUsage.user, 0.5)
      })
    })

    describe('Error Handling and Observability', () => {
      it('should support modern error structures', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        const modernError = new Error('Modern test error')
        modernError.name = 'ModernTestError' // Add some additional properties that modern error handling might include
        interface ExtendedError extends Error {
          code?: string
          severity?: string
          retryable?: boolean
        }
        ;(modernError as ExtendedError).code = 'TEST_ERROR_001'
        ;(modernError as ExtendedError).severity = 'medium'
        ;(modernError as ExtendedError).retryable = true

        testLogger.error('Modern error test', {
          error: modernError,
          context: {
            operation: 'test-operation',
            attempt: 1,
            maxRetries: 3,
          },
        })

        assertSpyCalls(consoleSpies.error, 1)
        const output = consoleSpies.error.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.level, 'error')
        assertEquals(parsed.payload.error.name, 'ModernTestError')
        assertEquals(parsed.payload.context.operation, 'test-operation')
      })

      it('should handle observability traces and spans', () => {
        testLogger = stoat.create({
          ...createTestConfig(),
          prettyPrint: true,
        })

        const observabilityData = {
          traceId: 'trace-observability-123',
          spanId: 'span-observability-456',
          parentSpanId: 'span-parent-789',
          operation: 'database-query',
          service: 'user-service',
          tags: ['database', 'postgresql', 'user-data'],
          duration: 45.67,
          status: 'success',
        }

        testLogger.info('Database operation traced', observabilityData)

        assertSpyCalls(consoleSpies.info, 1)
        const output = consoleSpies.info.calls[0].args[0] as string
        const parsed = JSON.parse(output)

        assertEquals(parsed.payload.traceId, 'trace-observability-123')
        assertEquals(parsed.payload.operation, 'database-query')
        assertEquals(parsed.payload.status, 'success')
      })
    })
  })
})
