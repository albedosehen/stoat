import { assert, assertEquals, assertExists, assertThrows } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import {
  type ContextConfig,
  type ErrorBoundaryConfig,
  type ObservabilityConfig,
  type PerformanceConfig,
  type PluginConfig,
  type SecurityConfig,
  type StoatConfig,
} from '../../types/config.ts'
import { ConfigValidationError, validateConfig } from '../../types/validation.ts'
import type { LogLevelName } from '../../types/logLevels.ts'

describe('Configuration Interfaces', () => {
  describe('Security Configuration', () => {
    it('should use default security configuration', () => {
      const config = {
        level: 'info' as LogLevelName,
      }

      const result = validateConfig(config)

      assertEquals(result.security.enabled, true)
      assertEquals(result.security.sanitizeInputs, true)
      assertExists(result.security.redactPaths)
      assert(result.security.redactPaths!.includes('password'))
      assert(result.security.redactPaths!.includes('token'))
      assertExists(result.security.redactPatterns)
      assert(result.security.redactPatterns!.length > 0)
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

    it('should support security config interface', () => {
      const securityConfig: SecurityConfig = {
        enabled: true,
        sanitizeInputs: true,
        redactPaths: ['password', 'token', 'apiKey'],
        redactPatterns: ['\\d{4}-\\d{4}-\\d{4}-\\d{4}'],
        maxStringLength: 8000,
        allowCircularRefs: false,
      }

      assertEquals(securityConfig.enabled, true)
      assertEquals(securityConfig.redactPaths!.length, 3)
      assertEquals(securityConfig.maxStringLength, 8000)
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
        ConfigValidationError,
      )
    })

    it('should support performance config interface', () => {
      const performanceConfig: PerformanceConfig = {
        enableAsyncLogging: true,
        enableSampling: false,
        samplingRate: 0.1,
        enableRateLimiting: true,
        rateLimit: 2000,
        enableMetrics: true,
        metricsInterval: 45000,
        memoryThreshold: 128 * 1024 * 1024,
      }

      assertEquals(performanceConfig.enableAsyncLogging, true)
      assertEquals(performanceConfig.samplingRate, 0.1)
      assertEquals(performanceConfig.rateLimit, 2000)
    })

    it('should validate rate limit bounds', () => {
      const invalidConfig = {
        level: 'info' as LogLevelName,
        performance: {
          rateLimit: -100, // Invalid - must be positive
        },
      }

      assertThrows(
        () => validateConfig(invalidConfig),
        ConfigValidationError,
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

    it('should support observability config interface', () => {
      const observabilityConfig: ObservabilityConfig = {
        enabled: true,
        traceIdHeader: 'x-trace-id',
        spanIdHeader: 'x-span-id',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'staging',
        enableAutoInstrumentation: false,
        exportEndpoint: 'https://telemetry.example.com',
        exportHeaders: {
          'x-api-key': 'secret-key',
        },
      }

      assertEquals(observabilityConfig.enabled, true)
      assertEquals(observabilityConfig.serviceName, 'test-service')
      assertEquals(observabilityConfig.exportHeaders!['x-api-key'], 'secret-key')
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
      assertExists(result.context.defaultFields)
      assertEquals(result.context.defaultFields!.service, 'my-service')
    })

    it('should support context config interface', () => {
      const contextConfig: ContextConfig = {
        enableAutoCorrelation: true,
        correlationIdHeader: 'x-correlation-id',
        sessionIdLength: 24,
        enableInheritance: true,
        defaultFields: {
          application: 'test-app',
          environment: 'development',
        },
        maxContextSize: 1500,
        enableContextValidation: true,
      }

      assertEquals(contextConfig.enableAutoCorrelation, true)
      assertEquals(contextConfig.sessionIdLength, 24)
      assertEquals(contextConfig.defaultFields!.application, 'test-app')
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
      assertExists(result.plugins.pluginPaths)
      assertEquals(result.plugins.pluginPaths!.length, 2)
      assertEquals(result.plugins.hookTimeout, 10000)
    })

    it('should support plugin config interface', () => {
      const pluginConfig: PluginConfig = {
        enabled: true,
        autoLoad: false,
        pluginPaths: ['./custom-plugins', './extensions'],
        enableHooks: true,
        hookTimeout: 8000,
        maxPlugins: 15,
      }

      assertEquals(pluginConfig.enabled, true)
      assertEquals(pluginConfig.pluginPaths!.length, 2)
      assertEquals(pluginConfig.maxPlugins, 15)
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

    it('should support error boundary config interface', () => {
      const errorBoundaryConfig: ErrorBoundaryConfig = {
        enabled: true,
        fallbackToConsole: true,
        suppressErrors: false,
        maxErrorsPerMinute: 50,
      }

      assertEquals(errorBoundaryConfig.enabled, true)
      assertEquals(errorBoundaryConfig.fallbackToConsole, true)
      assertEquals(errorBoundaryConfig.maxErrorsPerMinute, 50)
    })
  })

  describe('Main Stoat Configuration', () => {
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

    it('should support full stoat config interface', () => {
      const stoatConfig: Partial<StoatConfig> = {
        level: 'warn',
        name: 'my-logger',
        version: '2.1.0',
        transports: [
          { type: 'console', colors: true },
        ],
        security: {
          enabled: true,
          sanitizeInputs: true,
        },
        performance: {
          enableAsyncLogging: true,
          enableMetrics: false,
        },
        observability: {
          enabled: false,
        },
        context: {
          enableAutoCorrelation: true,
        },
        plugins: {
          enabled: false,
        },
        errorBoundary: {
          enabled: true,
        },
        development: {
          debugMode: true,
        },
        production: {
          optimized: true,
        },
        testing: {
          mockMode: true,
        },
      }

      assertEquals(stoatConfig.level, 'warn')
      assertEquals(stoatConfig.name, 'my-logger')
      assertEquals(stoatConfig.development!.debugMode, true)
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
  })

  describe('Configuration Performance', () => {
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
  })
})
