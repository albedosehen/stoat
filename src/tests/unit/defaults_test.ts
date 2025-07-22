import { assert, assertEquals, assertExists } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { DEFAULT_CONFIGS, type EnvironmentConfig } from '../../types/defaults.ts'
import type { LogLevelName } from '../../types/logLevels.ts'
import type { ConsoleTransport, FileTransport, MemoryTransport } from '../../types/transports.ts'

describe('Default Configuration System', () => {
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

  describe('Development Environment Configuration', () => {
    it('should be optimized for development', () => {
      const devConfig = DEFAULT_CONFIGS.development

      // Debug level for detailed logging
      assertEquals(devConfig.level, 'debug')

      // Console transport with colors and pretty printing
      assertEquals(devConfig.transports.length, 1)
      assertEquals(devConfig.transports[0].type, 'console')

      const consoleTransport = devConfig.transports[0] as ConsoleTransport
      assertEquals(consoleTransport.colors, true)
      assertEquals(consoleTransport.prettyPrint, true)

      // Security enabled but not overly restrictive
      assertEquals(devConfig.security.enabled, true)
      assertEquals(devConfig.security.sanitizeInputs, true)

      // Synchronous logging for immediate feedback
      assertEquals(devConfig.performance.enableAsyncLogging, false)
      assertEquals(devConfig.performance.enableSampling, false)
      assertEquals(devConfig.performance.enableMetrics, true)

      // Observability disabled by default in dev
      assertEquals(devConfig.observability.enabled, false)

      // Error boundary enabled but shows errors
      assertEquals(devConfig.errorBoundary.enabled, true)
      assertEquals(devConfig.errorBoundary.fallbackToConsole, true)
      assertEquals(devConfig.errorBoundary.suppressErrors, false)
    })

    it('should support environment config interface', () => {
      const devConfig: EnvironmentConfig = DEFAULT_CONFIGS.development

      assertExists(devConfig.level)
      assertExists(devConfig.transports)
      assertExists(devConfig.security)
      assertExists(devConfig.performance)
      assertExists(devConfig.observability)
      assertExists(devConfig.errorBoundary)

      // Verify it's a valid log level
      const validLevels: LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
      assert(validLevels.includes(devConfig.level))
    })
  })

  describe('Production Environment Configuration', () => {
    it('should be optimized for production', () => {
      const prodConfig = DEFAULT_CONFIGS.production

      // Info level to reduce noise
      assertEquals(prodConfig.level, 'info')

      // Multiple transports: console (no colors) + file
      assertEquals(prodConfig.transports.length, 2)
      assertEquals(prodConfig.transports[0].type, 'console')
      assertEquals(prodConfig.transports[1].type, 'file')

      const consoleTransport = prodConfig.transports[0] as ConsoleTransport
      assertEquals(consoleTransport.colors, false)
      assertEquals(consoleTransport.prettyPrint, false)

      const fileTransport = prodConfig.transports[1] as FileTransport
      assertEquals(fileTransport.destination, './logs/app.log')
      assertEquals(fileTransport.maxFileSize, 100 * 1024 * 1024)
      assertEquals(fileTransport.maxFiles, 10)
      assertEquals(fileTransport.compress, true)

      // Security enabled with limits
      assertEquals(prodConfig.security.enabled, true)
      assertEquals(prodConfig.security.sanitizeInputs, true)
      assertEquals(prodConfig.security.maxStringLength, 5000)

      // Performance optimizations enabled
      assertEquals(prodConfig.performance.enableAsyncLogging, true)
      assertEquals(prodConfig.performance.enableSampling, true)
      assertEquals(prodConfig.performance.samplingRate, 0.1)
      assertEquals(prodConfig.performance.enableRateLimiting, true)
      assertEquals(prodConfig.performance.rateLimit, 10000)

      // Observability enabled for monitoring
      assertEquals(prodConfig.observability.enabled, true)
      assertEquals(prodConfig.observability.enableAutoInstrumentation, true)

      // Error boundary suppresses errors in production
      assertEquals(prodConfig.errorBoundary.enabled, true)
      assertEquals(prodConfig.errorBoundary.fallbackToConsole, true)
      assertEquals(prodConfig.errorBoundary.suppressErrors, true)
    })

    it('should have appropriate file transport configuration', () => {
      const prodConfig = DEFAULT_CONFIGS.production
      const fileTransport = prodConfig.transports[1] as FileTransport

      assertEquals(fileTransport.type, 'file')
      assertEquals(fileTransport.destination, './logs/app.log')

      // Large files with rotation
      assertEquals(fileTransport.maxFileSize, 100 * 1024 * 1024) // 100MB
      assertEquals(fileTransport.maxFiles, 10)
      assertEquals(fileTransport.compress, true)
    })

    it('should have sampling enabled for high throughput', () => {
      const prodConfig = DEFAULT_CONFIGS.production

      assertEquals(prodConfig.performance.enableSampling, true)
      assertEquals(prodConfig.performance.samplingRate, 0.1) // 10% sampling
      assertEquals(prodConfig.performance.enableRateLimiting, true)
      assertEquals(prodConfig.performance.rateLimit, 10000)
    })
  })

  describe('Testing Environment Configuration', () => {
    it('should be optimized for testing', () => {
      const testConfig = DEFAULT_CONFIGS.testing

      // Fatal level to suppress most logging during tests
      assertEquals(testConfig.level, 'fatal')

      // Memory transport for test isolation
      assertEquals(testConfig.transports.length, 1)
      assertEquals(testConfig.transports[0].type, 'memory')

      const memoryTransport = testConfig.transports[0] as MemoryTransport
      assertEquals(memoryTransport.maxEntries, 100)

      // Security disabled for faster tests
      assertEquals(testConfig.security.enabled, false)

      // Performance features disabled
      assertEquals(testConfig.performance.enableAsyncLogging, false)
      assertEquals(testConfig.performance.enableSampling, false)
      assertEquals(testConfig.performance.enableMetrics, false)

      // Observability disabled
      assertEquals(testConfig.observability.enabled, false)

      // Error boundary enabled but silent
      assertEquals(testConfig.errorBoundary.enabled, true)
      assertEquals(testConfig.errorBoundary.fallbackToConsole, false)
      assertEquals(testConfig.errorBoundary.suppressErrors, true)
    })

    it('should use memory transport for isolation', () => {
      const testConfig = DEFAULT_CONFIGS.testing
      const memoryTransport = testConfig.transports[0] as MemoryTransport

      assertEquals(memoryTransport.type, 'memory')
      assertEquals(memoryTransport.maxEntries, 100)

      // Should have reasonable limits for testing
      assert(memoryTransport.maxEntries != null && memoryTransport.maxEntries > 0)
      assert(memoryTransport.maxEntries != null && memoryTransport.maxEntries <= 1000)
    })

    it('should minimize overhead during testing', () => {
      const testConfig = DEFAULT_CONFIGS.testing

      // Disabled features that could slow down tests
      assertEquals(testConfig.security.enabled, false)
      assertEquals(testConfig.performance.enableAsyncLogging, false)
      assertEquals(testConfig.performance.enableMetrics, false)
      assertEquals(testConfig.observability.enabled, false)
    })
  })

  describe('Environment Configuration Type', () => {
    it('should support EnvironmentConfig type', () => {
      const configs: EnvironmentConfig[] = [
        DEFAULT_CONFIGS.development,
        DEFAULT_CONFIGS.production,
        DEFAULT_CONFIGS.testing,
      ]

      configs.forEach((config, index) => {
        const envName = ['development', 'production', 'testing'][index]

        // All configs should have required fields
        assertExists(config.level, `${envName} config missing level`)
        assertExists(config.transports, `${envName} config missing transports`)
        assertExists(config.security, `${envName} config missing security`)
        assertExists(config.performance, `${envName} config missing performance`)
        assertExists(config.observability, `${envName} config missing observability`)
        assertExists(config.errorBoundary, `${envName} config missing errorBoundary`)

        // Transports should be non-empty
        assert(config.transports.length > 0, `${envName} config has no transports`)
      })
    })

    it('should have distinct configurations for each environment', () => {
      const { development, production, testing } = DEFAULT_CONFIGS

      // Different log levels
      assert(development.level === 'debug')
      assert(production.level === 'info')
      assert(testing.level === 'fatal')

      // Different transport configurations
      assertEquals(development.transports.length, 1)
      assertEquals(production.transports.length, 2)
      assertEquals(testing.transports.length, 1)

      // Different performance settings
      assertEquals(development.performance.enableAsyncLogging, false)
      assertEquals(production.performance.enableAsyncLogging, true)
      assertEquals(testing.performance.enableAsyncLogging, false)

      // Different security settings
      assertEquals(development.security.enabled, true)
      assertEquals(testing.security.enabled, false)

      // Different observability settings
      assertEquals(development.observability.enabled, false)
      assertEquals(production.observability.enabled, true)
    })
  })

  describe('Default Configuration Validation', () => {
    it('should have valid log levels', () => {
      const validLevels: LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

      Object.values(DEFAULT_CONFIGS).forEach((config) => {
        assert(validLevels.includes(config.level), `Invalid log level: ${config.level}`)
      })
    })

    it('should have valid transport configurations', () => {
      const validTransportTypes = ['console', 'file', 'async', 'memory', 'custom']

      Object.entries(DEFAULT_CONFIGS).forEach(([envName, config]) => {
        config.transports.forEach((transport, index) => {
          assert(
            validTransportTypes.includes(transport.type),
            `Invalid transport type in ${envName}[${index}]: ${transport.type}`,
          )
        })
      })
    })

    it('should have consistent configuration structure', () => {
      Object.entries(DEFAULT_CONFIGS).forEach(([envName, config]) => {
        // Required top-level properties
        assertExists(config.level, `${envName} missing level`)
        assertExists(config.transports, `${envName} missing transports`)
        assertExists(config.security, `${envName} missing security`)
        assertExists(config.performance, `${envName} missing performance`)
        assertExists(config.observability, `${envName} missing observability`)
        assertExists(config.errorBoundary, `${envName} missing errorBoundary`)

        // Security configuration
        assert(typeof config.security.enabled === 'boolean', `${envName} security.enabled not boolean`)

        // Performance configuration
        assert(
          typeof config.performance.enableAsyncLogging === 'boolean',
          `${envName} performance.enableAsyncLogging not boolean`,
        )

        // Observability configuration
        assert(typeof config.observability.enabled === 'boolean', `${envName} observability.enabled not boolean`)

        // Error boundary configuration
        assert(typeof config.errorBoundary.enabled === 'boolean', `${envName} errorBoundary.enabled not boolean`)
      })
    })
  })

  describe('Default Configuration Performance', () => {
    it('should access configurations efficiently', () => {
      const start = performance.now()

      // Access configurations many times
      for (let i = 0; i < 1000; i++) {
        const _ = DEFAULT_CONFIGS.development
        const __ = DEFAULT_CONFIGS.production
        const ___ = DEFAULT_CONFIGS.testing
      }

      const duration = performance.now() - start
      assert(duration < 50, `Configuration access took ${duration}ms, should be under 50ms`)
    })

    it('should be readonly configurations', () => {
      // Configurations should be const assertions (readonly)
      const devConfig = DEFAULT_CONFIGS.development

      // TypeScript should enforce readonly, but we can verify structure exists
      assertExists(devConfig.level)
      assertExists(devConfig.transports)

      // Transport array should exist and have items
      assert(Array.isArray(devConfig.transports))
      assert(devConfig.transports.length > 0)
    })
  })
})
