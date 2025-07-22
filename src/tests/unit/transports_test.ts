import { assert, assertEquals, assertThrows } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import {
  type AsyncTransport,
  type ConsoleTransport,
  type CustomTransport,
  type FileTransport,
  type MemoryTransport,
  TRANSPORT_TYPES,
  type TransportConfig,
  type TransportType,
} from '../../types/transports.ts'
import { ConfigValidationError, validateConfig } from '../../types/validation.ts'
import type { LogLevelName } from '../../types/logLevels.ts'

describe('Transport System', () => {
  describe('Transport Types and Constants', () => {
    it('should have correct transport types', () => {
      assert(TRANSPORT_TYPES.includes('console'))
      assert(TRANSPORT_TYPES.includes('file'))
      assert(TRANSPORT_TYPES.includes('async'))
      assert(TRANSPORT_TYPES.includes('memory'))
      assert(TRANSPORT_TYPES.includes('custom'))
    })

    it('should have all expected transport types', () => {
      assertEquals(TRANSPORT_TYPES.length, 5)
      const expectedTypes: TransportType[] = ['console', 'file', 'async', 'memory', 'custom']
      expectedTypes.forEach((type) => {
        assert(TRANSPORT_TYPES.includes(type))
      })
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
        ConfigValidationError,
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
        ConfigValidationError,
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

  describe('Transport Type Interfaces', () => {
    it('should support console transport interface', () => {
      const consoleTransport: ConsoleTransport = {
        type: 'console',
        enabled: true,
        colors: true,
        prettyPrint: false,
        level: 'debug',
        metadata: { env: 'test' },
      }

      assertEquals(consoleTransport.type, 'console')
      assertEquals(consoleTransport.colors, true)
      assertEquals(consoleTransport.prettyPrint, false)
    })

    it('should support file transport interface', () => {
      const fileTransport: FileTransport = {
        type: 'file',
        destination: './logs/test.log',
        enabled: true,
        maxFileSize: 1024 * 1024,
        maxFiles: 5,
        compress: false,
        append: true,
        rotation: 'size',
      }

      assertEquals(fileTransport.type, 'file')
      assertEquals(fileTransport.destination, './logs/test.log')
      assertEquals(fileTransport.rotation, 'size')
    })

    it('should support async transport interface', () => {
      const asyncTransport: AsyncTransport = {
        type: 'async',
        enabled: true,
        bufferSize: 1000,
        flushInterval: 500,
        maxBufferSize: 5000,
        syncOnExit: false,
        destination: './logs/async.log',
      }

      assertEquals(asyncTransport.type, 'async')
      assertEquals(asyncTransport.bufferSize, 1000)
      assertEquals(asyncTransport.syncOnExit, false)
    })

    it('should support memory transport interface', () => {
      const memoryTransport: MemoryTransport = {
        type: 'memory',
        enabled: true,
        maxEntries: 200,
        circular: false,
      }

      assertEquals(memoryTransport.type, 'memory')
      assertEquals(memoryTransport.maxEntries, 200)
      assertEquals(memoryTransport.circular, false)
    })

    it('should support custom transport interface', () => {
      const customTransport: CustomTransport = {
        type: 'custom',
        target: './my-transport.ts',
        enabled: true,
        options: {
          endpoint: 'https://api.example.com',
          timeout: 5000,
        },
      }

      assertEquals(customTransport.type, 'custom')
      assertEquals(customTransport.target, './my-transport.ts')
      assertEquals(customTransport.options?.endpoint, 'https://api.example.com')
    })
  })

  describe('Transport Union Type', () => {
    it('should support transport config union type', () => {
      const transports: TransportConfig[] = [
        { type: 'console', colors: true },
        { type: 'file', destination: './test.log' },
        { type: 'async', bufferSize: 1000 },
        { type: 'memory', maxEntries: 100 },
        { type: 'custom', target: './custom.js' },
      ]

      assertEquals(transports.length, 5)
      assertEquals(transports[0].type, 'console')
      assertEquals(transports[1].type, 'file')
      assertEquals(transports[2].type, 'async')
      assertEquals(transports[3].type, 'memory')
      assertEquals(transports[4].type, 'custom')
    })
  })

  describe('Transport Defaults and Edge Cases', () => {
    it('should apply transport defaults during validation', () => {
      const config = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'console' as const,
            // Minimal config - should get defaults
          },
        ],
      }

      const result = validateConfig(config)
      const transport = result.transports[0]

      assertEquals(transport.enabled, true) // Default enabled
      assertEquals(transport.type, 'console')
    })

    it('should handle transport with metadata', () => {
      const config = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'console' as const,
            metadata: {
              service: 'test-service',
              version: '1.0.0',
              environment: 'testing',
            },
          },
        ],
      }

      const result = validateConfig(config)
      const transport = result.transports[0]

      assertEquals(transport.metadata?.service, 'test-service')
      assertEquals(transport.metadata?.version, '1.0.0')
    })

    it('should handle transport with custom log level', () => {
      const config = {
        level: 'info' as LogLevelName,
        transports: [
          {
            type: 'console' as const,
            level: 'error' as LogLevelName, // Transport-specific level
          },
        ],
      }

      const result = validateConfig(config)
      const transport = result.transports[0]

      assertEquals(transport.level, 'error')
    })
  })
})
