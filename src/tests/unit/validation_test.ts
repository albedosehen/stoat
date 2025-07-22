import { assert, assertEquals, assertExists, assertThrows } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import {
  applyConfigDefaults,
  applyTransportDefaults,
  ConfigValidationError,
  isValidLogLevel,
  isValidTransportType,
  validateConfig,
  validateTransport,
} from '../../types/validation.ts'
import type { LogLevelName } from '../../types/logLevels.ts'

describe('Validation System', () => {
  describe('ConfigValidationError Class', () => {
    it('should create ConfigValidationError with message', () => {
      const error = new ConfigValidationError('Test error')

      assertEquals(error.name, 'ConfigValidationError')
      assertEquals(error.message, 'Test error')
      assertEquals(error.issues.length, 0)
      assert(error instanceof Error)
      assert(error instanceof ConfigValidationError)
    })

    it('should create ConfigValidationError with issues', () => {
      const issues = ['Issue 1', 'Issue 2', 'Issue 3']
      const error = new ConfigValidationError('Multiple issues', issues)

      assertEquals(error.name, 'ConfigValidationError')
      assertEquals(error.message, 'Multiple issues')
      assertEquals(error.issues, issues)
      assertEquals(error.issues.length, 3)
    })

    it('should be throwable and catchable', () => {
      const issues = ['Invalid config']

      assertThrows(
        () => {
          throw new ConfigValidationError('Test throw', issues)
        },
        ConfigValidationError,
        'Test throw',
      )

      try {
        throw new ConfigValidationError('Catch test', issues)
      } catch (error) {
        assert(error instanceof ConfigValidationError)
        assertEquals(error.issues, issues)
      }
    })
  })

  describe('Type Guard Functions', () => {
    it('should validate log levels correctly', () => {
      // Valid log levels
      assert(isValidLogLevel('trace'))
      assert(isValidLogLevel('debug'))
      assert(isValidLogLevel('info'))
      assert(isValidLogLevel('warn'))
      assert(isValidLogLevel('error'))
      assert(isValidLogLevel('fatal'))

      // Invalid log levels
      assert(!isValidLogLevel('INVALID_LEVEL'))
      assert(!isValidLogLevel(''))
      assert(!isValidLogLevel(null))
      assert(!isValidLogLevel(undefined))
      assert(!isValidLogLevel(123))
      assert(!isValidLogLevel({}))
      assert(!isValidLogLevel([]))
    })

    it('should validate transport types correctly', () => {
      // Valid transport types
      assert(isValidTransportType('console'))
      assert(isValidTransportType('file'))
      assert(isValidTransportType('async'))
      assert(isValidTransportType('memory'))
      assert(isValidTransportType('custom'))

      // Invalid transport types
      assert(!isValidTransportType('INVALID_TRANSPORT'))
      assert(!isValidTransportType(''))
      assert(!isValidTransportType(null))
      assert(!isValidTransportType(undefined))
      assert(!isValidTransportType(123))
      assert(!isValidTransportType({}))
      assert(!isValidTransportType([]))
    })
  })

  describe('Configuration Validation', () => {
    it('should reject invalid log levels', () => {
      const invalidConfig = {
        level: 'INVALID_LEVEL',
      }

      assertThrows(
        () => validateConfig(invalidConfig),
        ConfigValidationError,
      )
    })

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

    it('should reject invalid configuration object', () => {
      assertThrows(
        () => validateConfig(null),
        ConfigValidationError,
        'Configuration must be an object',
      )

      assertThrows(
        () => validateConfig('not an object'),
        ConfigValidationError,
        'Configuration must be an object',
      )

      assertThrows(
        () => validateConfig(123),
        ConfigValidationError,
        'Configuration must be an object',
      )
    })

    it('should validate name and version types', () => {
      const invalidNameConfig = {
        level: 'info' as LogLevelName,
        name: 123, // Should be string
      }

      assertThrows(
        () => validateConfig(invalidNameConfig),
        ConfigValidationError,
      )

      const invalidVersionConfig = {
        level: 'info' as LogLevelName,
        version: {}, // Should be string
      }

      assertThrows(
        () => validateConfig(invalidVersionConfig),
        ConfigValidationError,
      )
    })

    it('should validate transports array', () => {
      const invalidTransportsConfig = {
        level: 'info' as LogLevelName,
        transports: 'not an array',
      }

      assertThrows(
        () => validateConfig(invalidTransportsConfig),
        ConfigValidationError,
      )
    })
  })

  describe('Transport Validation', () => {
    it('should validate transport object', () => {
      assertThrows(
        () => validateTransport(null),
        ConfigValidationError,
        'Transport must be an object',
      )

      assertThrows(
        () => validateTransport('not an object'),
        ConfigValidationError,
        'Transport must be an object',
      )
    })

    it('should validate transport type', () => {
      const invalidTransport = {
        type: 'INVALID_TYPE',
      }

      assertThrows(
        () => validateTransport(invalidTransport),
        ConfigValidationError,
      )
    })

    it('should validate transport level', () => {
      const invalidTransport = {
        type: 'console',
        level: 'INVALID_LEVEL',
      }

      assertThrows(
        () => validateTransport(invalidTransport),
        ConfigValidationError,
      )
    })

    it('should validate transport enabled property', () => {
      const invalidTransport = {
        type: 'console',
        enabled: 'not a boolean',
      }

      assertThrows(
        () => validateTransport(invalidTransport),
        ConfigValidationError,
      )
    })

    it('should validate console transport properties', () => {
      const invalidConsoleTransport = {
        type: 'console',
        colors: 'not a boolean',
      }

      assertThrows(
        () => validateTransport(invalidConsoleTransport),
        ConfigValidationError,
      )
    })

    it('should validate file transport properties', () => {
      // Missing destination
      const missingDestination = {
        type: 'file',
      }

      assertThrows(
        () => validateTransport(missingDestination),
        ConfigValidationError,
      )

      // Invalid maxFileSize
      const invalidMaxFileSize = {
        type: 'file',
        destination: './test.log',
        maxFileSize: -100,
      }

      assertThrows(
        () => validateTransport(invalidMaxFileSize),
        ConfigValidationError,
      )

      // Invalid rotation
      const invalidRotation = {
        type: 'file',
        destination: './test.log',
        rotation: 'INVALID_ROTATION',
      }

      assertThrows(
        () => validateTransport(invalidRotation),
        ConfigValidationError,
      )
    })

    it('should validate async transport properties', () => {
      const invalidBufferSize = {
        type: 'async',
        bufferSize: -100,
      }

      assertThrows(
        () => validateTransport(invalidBufferSize),
        ConfigValidationError,
      )

      const invalidFlushInterval = {
        type: 'async',
        flushInterval: 0,
      }

      assertThrows(
        () => validateTransport(invalidFlushInterval),
        ConfigValidationError,
      )
    })

    it('should validate memory transport properties', () => {
      const invalidMaxEntries = {
        type: 'memory',
        maxEntries: -10,
      }

      assertThrows(
        () => validateTransport(invalidMaxEntries),
        ConfigValidationError,
      )

      const invalidCircular = {
        type: 'memory',
        circular: 'not a boolean',
      }

      assertThrows(
        () => validateTransport(invalidCircular),
        ConfigValidationError,
      )
    })

    it('should validate custom transport properties', () => {
      const missingTarget = {
        type: 'custom',
      }

      assertThrows(
        () => validateTransport(missingTarget),
        ConfigValidationError,
      )

      const invalidTarget = {
        type: 'custom',
        target: 123,
      }

      assertThrows(
        () => validateTransport(invalidTarget),
        ConfigValidationError,
      )
    })
  })

  describe('Performance Configuration Validation', () => {
    it('should reject invalid sampling rate', () => {
      const config = {
        level: 'info' as LogLevelName,
        performance: {
          samplingRate: 1.5, // Invalid - must be between 0 and 1
        },
      }

      assertThrows(
        () => validateConfig(config),
        ConfigValidationError,
      )

      const negativeConfig = {
        level: 'info' as LogLevelName,
        performance: {
          samplingRate: -0.1, // Invalid - must be between 0 and 1
        },
      }

      assertThrows(
        () => validateConfig(negativeConfig),
        ConfigValidationError,
      )
    })

    it('should reject invalid rate limit', () => {
      const config = {
        level: 'info' as LogLevelName,
        performance: {
          rateLimit: -100, // Invalid - must be positive
        },
      }

      assertThrows(
        () => validateConfig(config),
        ConfigValidationError,
      )

      const zeroConfig = {
        level: 'info' as LogLevelName,
        performance: {
          rateLimit: 0, // Invalid - must be positive
        },
      }

      assertThrows(
        () => validateConfig(zeroConfig),
        ConfigValidationError,
      )
    })

    it('should accept valid performance configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
        performance: {
          samplingRate: 0.5,
          rateLimit: 1000,
        },
      }

      const result = validateConfig(config)
      assertEquals(result.performance.samplingRate, 0.5)
      assertEquals(result.performance.rateLimit, 1000)
    })
  })

  describe('Transport Defaults Application', () => {
    it('should apply console transport defaults', () => {
      const transport = applyTransportDefaults({
        type: 'console',
      })

      assertEquals(transport.type, 'console')
      assertEquals(transport.enabled, true)
    })

    it('should apply file transport defaults', () => {
      const transport = applyTransportDefaults({
        type: 'file',
        destination: './test.log',
      })

      assertEquals(transport.type, 'file')
      assertEquals(transport.enabled, true)
    })

    it('should preserve existing transport properties', () => {
      const transport = applyTransportDefaults({
        type: 'console',
        enabled: false,
        colors: false,
      })

      assertEquals(transport.enabled, false)
    })
  })

  describe('Configuration Defaults Application', () => {
    it('should apply default configuration', () => {
      const config = applyConfigDefaults({
        level: 'debug',
        transports: [],
        security: {},
        performance: {},
        observability: {},
        context: {},
        plugins: {},
        errorBoundary: {},
      })

      assertEquals(config.level, 'debug')
      assertExists(config.security)
      assertExists(config.performance)
      assertExists(config.observability)
      assertExists(config.context)
      assertExists(config.plugins)
      assertExists(config.errorBoundary)
    })

    it('should merge user config with defaults', () => {
      const config = applyConfigDefaults({
        level: 'warn',
        transports: [],
        security: { enabled: false },
        performance: { enableAsyncLogging: false },
        observability: {},
        context: {},
        plugins: {},
        errorBoundary: {},
      })

      assertEquals(config.level, 'warn')
      assertEquals(config.security.enabled, false)
      assertEquals(config.performance.enableAsyncLogging, false)
      // Should still have other defaults
      assertExists(config.security.sanitizeInputs)
      assertExists(config.performance.enableMetrics)
    })
  })

  describe('Complex Validation Scenarios', () => {
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

    it('should handle multiple transport validation errors', () => {
      const config = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'file',
            // Missing destination
          },
          {
            type: 'custom',
            // Missing target
          },
        ],
      }

      assertThrows(
        () => validateConfig(config),
        ConfigValidationError,
      )
    })
  })

  describe('Validation Performance', () => {
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

    it('should perform type validation efficiently', () => {
      const start = performance.now()

      // Perform many type validations
      for (let i = 0; i < 1000; i++) {
        isValidLogLevel('info')
        isValidLogLevel('INVALID')
        isValidTransportType('console')
        isValidTransportType('INVALID')
      }

      const duration = performance.now() - start
      assert(duration < 50, `Type validation took ${duration}ms, should be under 50ms`)
    })
  })

  describe('Error Message Quality', () => {
    it('should provide descriptive error messages', () => {
      try {
        validateConfig({
          level: 'INVALID_LEVEL',
        })
        assert(false, 'Should have thrown')
      } catch (error) {
        assert(error instanceof ConfigValidationError)
        assert(error.message.includes('validation failed'))
        assert(error.issues.length > 0)
        assert(error.issues[0].includes('Invalid log level'))
      }
    })

    it('should provide multiple error issues', () => {
      try {
        validateConfig({
          level: 'INVALID_LEVEL',
          name: 123,
          version: {},
        })
        assert(false, 'Should have thrown')
      } catch (error) {
        assert(error instanceof ConfigValidationError)
        assert(error.issues.length >= 3) // Multiple validation issues
      }
    })

    it('should provide transport-specific error messages', () => {
      try {
        validateTransport({
          type: 'file',
          maxFileSize: -100,
          rotation: 'INVALID',
        })
        assert(false, 'Should have thrown')
      } catch (error) {
        assert(error instanceof ConfigValidationError)
        assert(error.issues.length >= 2) // Multiple transport issues
      }
    })
  })
})
