import { assert, assertEquals, assertExists, assertThrows } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import {
  DEFAULT_CONFIGS,
  ENV_VAR_MAPPING,
  getEnvVarName,
  LOG_LEVEL_NAMES,
  LOG_LEVEL_VALUES,
  type LogLevelName,
  normalizeEnvValue,
  STOAT_ENV_PREFIX,
  TRANSPORT_TYPES,
  validateConfig,
} from '../../types/schema.ts'
import { ZodError } from 'zod'

describe('Configuration Schema System', () => {
  describe('Schema Types and Constants', () => {
    it('should have correct log level types', () => {
      assert(LOG_LEVEL_NAMES.includes('trace'))
      assert(LOG_LEVEL_NAMES.includes('debug'))
      assert(LOG_LEVEL_NAMES.includes('info'))
      assert(LOG_LEVEL_NAMES.includes('warn'))
      assert(LOG_LEVEL_NAMES.includes('error'))
      assert(LOG_LEVEL_NAMES.includes('fatal'))

      // Test log level values
      assertExists(LOG_LEVEL_VALUES.trace)
      assertExists(LOG_LEVEL_VALUES.debug)
      assertExists(LOG_LEVEL_VALUES.info)
      assertExists(LOG_LEVEL_VALUES.warn)
      assertExists(LOG_LEVEL_VALUES.error)
      assertExists(LOG_LEVEL_VALUES.fatal)

      // Values should be in ascending order
      assert(LOG_LEVEL_VALUES.trace < LOG_LEVEL_VALUES.debug)
      assert(LOG_LEVEL_VALUES.debug < LOG_LEVEL_VALUES.info)
      assert(LOG_LEVEL_VALUES.info < LOG_LEVEL_VALUES.warn)
      assert(LOG_LEVEL_VALUES.warn < LOG_LEVEL_VALUES.error)
      assert(LOG_LEVEL_VALUES.error < LOG_LEVEL_VALUES.fatal)
    })

    it('should have correct transport types', () => {
      assert(TRANSPORT_TYPES.includes('console'))
      assert(TRANSPORT_TYPES.includes('file'))
      assert(TRANSPORT_TYPES.includes('async'))
      assert(TRANSPORT_TYPES.includes('memory'))
      assert(TRANSPORT_TYPES.includes('custom'))
    })

    it('should have environment variable prefix', () => {
      assertEquals(STOAT_ENV_PREFIX, 'STOAT_')
    })
  })

  describe('Configuration Validation', () => {
    it('should validate minimal configuration', () => {
      const minimalConfig = {
        level: 'info' as LogLevelName,
      }

      const result = validateConfig(minimalConfig)

      assertEquals(result.level, 'info')
      assertEquals(result.transports.length, 1) // Default console transport
      assertEquals(result.transports[0].type, 'console')
      assertExists(result.security)
      assertExists(result.performance)
      assertExists(result.observability)
      assertExists(result.context)
      assertExists(result.plugins)
      assertExists(result.errorBoundary)
    })

    it('should validate empty configuration with defaults', () => {
      const emptyConfig = {}
      const result = validateConfig(emptyConfig)

      // Should use defaults
      assertEquals(result.level, 'info')
      assertEquals(result.transports.length, 1)
      assertEquals(result.transports[0].type, 'console')
      assertEquals(result.transports[0].enabled, true)
    })

    it('should validate configuration with custom name and version', () => {
      const config = {
        level: 'debug' as LogLevelName,
        name: 'test-logger',
        version: '1.0.0',
      }

      const result = validateConfig(config)

      assertEquals(result.level, 'debug')
      assertEquals(result.name, 'test-logger')
      assertEquals(result.version, '1.0.0')
    })

    it('should reject invalid log levels', () => {
      const invalidConfig = {
        level: 'INVALID_LEVEL',
      }

      assertThrows(
        () => validateConfig(invalidConfig),
        ZodError,
      )
    })

    it('should validate configuration with multiple transports', () => {
      const config = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'console' as const,
            enabled: true,
            colors: true,
            prettyPrint: false,
          },
          {
            type: 'file' as const,
            enabled: true,
            destination: './logs/app.log',
            maxFileSize: 100 * 1024 * 1024,
            maxFiles: 10,
            compress: true,
            append: true,
            rotation: 'daily' as const,
          },
        ],
      }

      const result = validateConfig(config)

      assertEquals(result.transports.length, 2)
      assertEquals(result.transports[0].type, 'console')
      assertEquals(result.transports[1].type, 'file')
    })
  })

  describe('Transport Configuration Validation', () => {
    it('should validate console transport', () => {
      const config = {
        level: 'debug' as LogLevelName,
        transports: [
          {
            type: 'console' as const,
            enabled: true,
            level: 'trace' as LogLevelName,
            colors: false,
            prettyPrint: true,
            metadata: { environment: 'test' },
          },
        ],
      }

      const result = validateConfig(config)
      const consoleTransport = result.transports[0]

      assertEquals(consoleTransport.type, 'console')
      assertEquals(consoleTransport.level, 'trace')
      assertEquals(consoleTransport.enabled, true)
    })

    it('should validate file transport', () => {
      const config = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'file' as const,
            enabled: true,
            destination: '/var/log/app.log',
            maxFileSize: 50 * 1024 * 1024,
            maxFiles: 5,
            compress: true,
            append: true,
            rotation: 'hourly' as const,
          },
        ],
      }

      const result = validateConfig(config)
      interface FileTransportResult {
        type: string
        destination: string
        maxFileSize: number
        maxFiles: number
        compress: boolean
        rotation: string
      }
      const fileTransport = result.transports[0] as FileTransportResult

      assertEquals(fileTransport.type, 'file')
      assertEquals(fileTransport.destination, '/var/log/app.log')
      assertEquals(fileTransport.maxFileSize, 50 * 1024 * 1024)
      assertEquals(fileTransport.rotation, 'hourly')
    })

    it('should validate async transport', () => {
      const config = {
        level: 'debug' as LogLevelName,
        transports: [
          {
            type: 'async' as const,
            enabled: true,
            bufferSize: 5000,
            flushInterval: 2000,
            maxBufferSize: 25000,
            syncOnExit: true,
          },
        ],
      }

      const result = validateConfig(config)
      interface AsyncTransportResult {
        type: string
        bufferSize: number
        flushInterval: number
        maxBufferSize: number
        syncOnExit: boolean
      }
      const asyncTransport = result.transports[0] as AsyncTransportResult

      assertEquals(asyncTransport.type, 'async')
      assertEquals(asyncTransport.bufferSize, 5000)
      assertEquals(asyncTransport.flushInterval, 2000)
    })

    it('should validate memory transport', () => {
      const config = {
        level: 'trace' as LogLevelName,
        transports: [
          {
            type: 'memory' as const,
            enabled: true,
            maxEntries: 500,
            circular: true,
          },
        ],
      }

      const result = validateConfig(config)
      interface MemoryTransportResult {
        type: string
        maxEntries: number
        circular: boolean
      }
      const memoryTransport = result.transports[0] as MemoryTransportResult

      assertEquals(memoryTransport.type, 'memory')
      assertEquals(memoryTransport.maxEntries, 500)
      assertEquals(memoryTransport.circular, true)
    })

    it('should validate custom transport', () => {
      const config = {
        level: 'warn' as LogLevelName,
        transports: [
          {
            type: 'custom' as const,
            enabled: true,
            target: './custom-transport.js',
            options: {
              url: 'https://logs.example.com',
              apiKey: 'test-key',
            },
          },
        ],
      }

      const result = validateConfig(config)
      interface CustomTransportResult {
        type: string
        target: string
        options?: Record<string, unknown>
      }
      const customTransport = result.transports[0] as CustomTransportResult

      assertEquals(customTransport.type, 'custom')
      assertEquals(customTransport.target, './custom-transport.js')
      assertEquals(customTransport.options?.url, 'https://logs.example.com')
    })

    it('should reject invalid transport configurations', () => {
      // Missing required destination for file transport
      const invalidFileConfig = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'file' as const,
            enabled: true,
            // Missing 'destination' field
          },
        ],
      }

      assertThrows(
        () => validateConfig(invalidFileConfig),
        ZodError,
      )

      // Missing required target for custom transport
      const invalidCustomConfig = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'custom' as const,
            enabled: true,
            // Missing 'target' field
          },
        ],
      }

      assertThrows(
        () => validateConfig(invalidCustomConfig),
        ZodError,
      )
    })
  })

  describe('Security Configuration', () => {
    it('should use default security configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
      }

      const result = validateConfig(config)

      assertEquals(result.security.enabled, true)
      assertEquals(result.security.sanitizeInputs, true)
      assert(result.security.redactPaths.includes('password'))
      assert(result.security.redactPaths.includes('token'))
      assert(result.security.redactPatterns.length > 0)
      assertEquals(result.security.maxStringLength, 10000)
      assertEquals(result.security.allowCircularRefs, false)
    })

    it('should validate custom security configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        security: {
          enabled: false,
          sanitizeInputs: false,
          redactPaths: ['customSecret'],
          redactPatterns: ['custom-pattern'],
          maxStringLength: 5000,
          allowCircularRefs: true,
        },
      }

      const result = validateConfig(config)

      assertEquals(result.security.enabled, false)
      assertEquals(result.security.sanitizeInputs, false)
      assertEquals(result.security.redactPaths, ['customSecret'])
      assertEquals(result.security.redactPatterns, ['custom-pattern'])
      assertEquals(result.security.maxStringLength, 5000)
      assertEquals(result.security.allowCircularRefs, true)
    })
  })

  describe('Performance Configuration', () => {
    it('should validate performance configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        performance: {
          enableAsyncLogging: false,
          enableSampling: true,
          samplingRate: 0.5,
          enableRateLimiting: true,
          rateLimit: 5000,
          enableMetrics: false,
          metricsInterval: 30000,
          memoryThreshold: 200 * 1024 * 1024,
        },
      }

      const result = validateConfig(config)

      assertEquals(result.performance.enableAsyncLogging, false)
      assertEquals(result.performance.samplingRate, 0.5)
      assertEquals(result.performance.rateLimit, 5000)
      assertEquals(result.performance.enableMetrics, false)
    })

    it('should reject invalid sampling rate', () => {
      const config = {
        level: 'info' as LogLevelName,
        performance: {
          samplingRate: 1.5, // Invalid - must be between 0 and 1
        },
      }

      assertThrows(
        () => validateConfig(config),
        ZodError,
      )
    })
  })

  describe('Observability Configuration', () => {
    it('should validate observability configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        observability: {
          enabled: true,
          traceIdHeader: 'x-custom-trace-id',
          spanIdHeader: 'x-custom-span-id',
          serviceName: 'my-service',
          serviceVersion: '2.0.0',
          environment: 'production',
          enableAutoInstrumentation: true,
          exportEndpoint: 'https://otel.example.com',
          exportHeaders: {
            'Authorization': 'Bearer token',
          },
        },
      }

      const result = validateConfig(config)

      assertEquals(result.observability.enabled, true)
      assertEquals(result.observability.serviceName, 'my-service')
      assertEquals(result.observability.exportEndpoint, 'https://otel.example.com')
    })
  })

  describe('Context Configuration', () => {
    it('should validate context configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        context: {
          enableAutoCorrelation: false,
          correlationIdHeader: 'x-request-id',
          sessionIdLength: 32,
          enableInheritance: false,
          defaultFields: {
            service: 'my-service',
            version: '1.0.0',
          },
          maxContextSize: 2000,
          enableContextValidation: false,
        },
      }

      const result = validateConfig(config)

      assertEquals(result.context.enableAutoCorrelation, false)
      assertEquals(result.context.correlationIdHeader, 'x-request-id')
      assertEquals(result.context.sessionIdLength, 32)
      assertEquals(result.context.defaultFields.service, 'my-service')
    })
  })

  describe('Plugin Configuration', () => {
    it('should validate plugin configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        plugins: {
          enabled: false,
          autoLoad: true,
          pluginPaths: ['./plugins', '/usr/local/stoat-plugins'],
          enableHooks: false,
          hookTimeout: 10000,
          maxPlugins: 25,
        },
      }

      const result = validateConfig(config)

      assertEquals(result.plugins.enabled, false)
      assertEquals(result.plugins.autoLoad, true)
      assertEquals(result.plugins.pluginPaths.length, 2)
      assertEquals(result.plugins.hookTimeout, 10000)
    })
  })

  describe('Error Boundary Configuration', () => {
    it('should validate error boundary configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        errorBoundary: {
          enabled: false,
          fallbackToConsole: false,
          suppressErrors: true,
          maxErrorsPerMinute: 200,
        },
      }

      const result = validateConfig(config)

      assertEquals(result.errorBoundary.enabled, false)
      assertEquals(result.errorBoundary.fallbackToConsole, false)
      assertEquals(result.errorBoundary.suppressErrors, true)
      assertEquals(result.errorBoundary.maxErrorsPerMinute, 200)
    })
  })

  describe('Default Environment Configurations', () => {
    it('should have development configuration', () => {
      const devConfig = DEFAULT_CONFIGS.development

      assertEquals(devConfig.level, 'debug')
      assertEquals(devConfig.transports[0].type, 'console')
      assertEquals(devConfig.performance.enableAsyncLogging, false)
      assertEquals(devConfig.errorBoundary.suppressErrors, false)
    })

    it('should have production configuration', () => {
      const prodConfig = DEFAULT_CONFIGS.production

      assertEquals(prodConfig.level, 'info')
      assertEquals(prodConfig.transports.length, 2) // console + file
      assertEquals(prodConfig.transports[1].type, 'file')
      assertEquals(prodConfig.performance.enableAsyncLogging, true)
      assertEquals(prodConfig.observability.enabled, true)
    })

    it('should have testing configuration', () => {
      const testConfig = DEFAULT_CONFIGS.testing

      assertEquals(testConfig.level, 'fatal')
      assertEquals(testConfig.transports[0].type, 'memory')
      assertEquals(testConfig.security.enabled, false)
      assertEquals(testConfig.performance.enableMetrics, false)
    })
  })

  describe('Environment Variable Utilities', () => {
    it('should normalize environment values correctly', () => {
      const testCases = [
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: '42', expected: 42 },
        { input: '3.14', expected: 3.14 },
        { input: 'hello', expected: 'hello' },
        { input: '0', expected: 0 },
        { input: '1', expected: 1 },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = normalizeEnvValue(input)
        assertEquals(result, expected)
      })
    })

    it('should map environment variables correctly', () => {
      // Test a few key mappings
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}LEVEL`], 'level')
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}SECURITY_ENABLED`], 'security.enabled')
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}ASYNC_LOGGING`], 'performance.enableAsyncLogging')
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}SERVICE_NAME`], 'observability.serviceName')
    })

    it('should find environment variable names for config paths', () => {
      assertEquals(getEnvVarName('level'), `${STOAT_ENV_PREFIX}LEVEL`)
      assertEquals(getEnvVarName('security.enabled'), `${STOAT_ENV_PREFIX}SECURITY_ENABLED`)
      assertEquals(getEnvVarName('nonexistent.path'), undefined)
    })

    it('should have consistent environment variable prefix', () => {
      // All environment variables should start with the prefix
      Object.keys(ENV_VAR_MAPPING).forEach((envVar) => {
        assert(envVar.startsWith(STOAT_ENV_PREFIX))
      })
    })
  })

  describe('Schema Performance and Edge Cases', () => {
    it('should handle complex configuration', () => {
      const complexConfig = {
        level: 'debug' as LogLevelName,
        name: 'complex-logger',
        version: '1.0.0',
        transports: [
          {
            type: 'console' as const,
            enabled: true,
            colors: true,
            prettyPrint: true,
          },
          {
            type: 'file' as const,
            enabled: true,
            destination: './logs/app.log',
            maxFileSize: 100 * 1024 * 1024,
            maxFiles: 10,
            compress: true,
            append: true,
            rotation: 'daily' as const,
          },
        ],
        development: {
          customDevOption: true,
        },
        production: {
          customProdOption: 'value',
        },
      }

      // Should not throw
      const result = validateConfig(complexConfig)
      assertEquals(result.transports.length, 2)
      assertExists(result.development)
      assertExists(result.production)
    })

    it('should validate configuration within reasonable time', () => {
      const start = performance.now()

      const config = {
        level: 'debug' as LogLevelName,
        transports: [
          {
            type: 'console' as const,
            enabled: true,
            colors: true,
            prettyPrint: false,
          },
          {
            type: 'file' as const,
            enabled: true,
            destination: './test.log',
            maxFileSize: 100 * 1024 * 1024,
            maxFiles: 10,
            compress: false,
            append: true,
            rotation: 'daily' as const,
          },
        ],
        security: {
          enabled: true,
          sanitizeInputs: true,
          redactPaths: ['password', 'secret'],
          redactPatterns: ['\\d{4}-\\d{4}-\\d{4}-\\d{4}'],
          maxStringLength: 10000,
          allowCircularRefs: false,
        },
      }

      validateConfig(config)

      const duration = performance.now() - start
      assert(duration < 100) // Should complete within 100ms
    })

    it('should handle configuration with environment overrides', () => {
      const config = {
        level: 'info' as LogLevelName,
        development: {
          debugMode: true,
          verboseLogging: true,
        },
        production: {
          optimizations: true,
          compressionLevel: 9,
        },
        testing: {
          mockTransports: true,
          silentMode: true,
        },
      }

      const result = validateConfig(config)

      assertEquals(result.level, 'info')
      assertExists(result.development)
      assertExists(result.production)
      assertExists(result.testing)
    })
  })
})
