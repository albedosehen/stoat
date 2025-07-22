import { assert, assertEquals, assertExists } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import {
  getLogLevelColor,
  getLogLevelValue,
  LOG_DISPLAY_CONFIG,
  LOG_LEVEL_CONFIG,
  LOG_LEVEL_NAMES,
  LOG_LEVEL_VALUES,
  LOG_SEVERITY_COLORS,
  type LogLevelName,
  shouldLogLevel,
} from '../../types/logLevels.ts'

describe('Log Level System', () => {
  describe('Log Level Constants and Types', () => {
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

    it('should have correct log level values', () => {
      assertEquals(LOG_LEVEL_VALUES.trace, 10)
      assertEquals(LOG_LEVEL_VALUES.debug, 20)
      assertEquals(LOG_LEVEL_VALUES.info, 30)
      assertEquals(LOG_LEVEL_VALUES.warn, 40)
      assertEquals(LOG_LEVEL_VALUES.error, 50)
      assertEquals(LOG_LEVEL_VALUES.fatal, 60)
    })

    it('should have all log levels defined', () => {
      assertEquals(LOG_LEVEL_NAMES.length, 6)
      assertEquals(Object.keys(LOG_LEVEL_VALUES).length, 6)
    })
  })

  describe('Log Level Colors', () => {
    it('should have color mappings for all log levels', () => {
      LOG_LEVEL_NAMES.forEach((level) => {
        assertExists(LOG_SEVERITY_COLORS[level])
        assert(typeof LOG_SEVERITY_COLORS[level] === 'string')
        assert(LOG_SEVERITY_COLORS[level].startsWith('\x1b['))
      })
    })

    it('should have display configuration constants', () => {
      assertExists(LOG_DISPLAY_CONFIG.colorReset)
      assertExists(LOG_DISPLAY_CONFIG.bold)
      assertExists(LOG_DISPLAY_CONFIG.dim)
      assertExists(LOG_DISPLAY_CONFIG.underline)

      assertEquals(LOG_DISPLAY_CONFIG.colorReset, '\x1b[0m')
      assertEquals(LOG_DISPLAY_CONFIG.bold, '\x1b[1m')
    })
  })

  describe('Log Level Configuration', () => {
    it('should have unified log level config', () => {
      LOG_LEVEL_NAMES.forEach((level) => {
        const config = LOG_LEVEL_CONFIG[level]
        assertExists(config)
        assertExists(config.value)
        assertExists(config.color)
        assertEquals(config.value, LOG_LEVEL_VALUES[level])
        assertEquals(config.color, LOG_SEVERITY_COLORS[level])
      })
    })
  })

  describe('Log Level Utility Functions', () => {
    it('should get log level values correctly', () => {
      assertEquals(getLogLevelValue('trace'), 10)
      assertEquals(getLogLevelValue('debug'), 20)
      assertEquals(getLogLevelValue('info'), 30)
      assertEquals(getLogLevelValue('warn'), 40)
      assertEquals(getLogLevelValue('error'), 50)
      assertEquals(getLogLevelValue('fatal'), 60)
    })

    it('should get log level colors correctly', () => {
      assertEquals(getLogLevelColor('trace'), LOG_SEVERITY_COLORS.trace)
      assertEquals(getLogLevelColor('debug'), LOG_SEVERITY_COLORS.debug)
      assertEquals(getLogLevelColor('info'), LOG_SEVERITY_COLORS.info)
      assertEquals(getLogLevelColor('warn'), LOG_SEVERITY_COLORS.warn)
      assertEquals(getLogLevelColor('error'), LOG_SEVERITY_COLORS.error)
      assertEquals(getLogLevelColor('fatal'), LOG_SEVERITY_COLORS.fatal)
    })

    it('should determine if log level should be displayed', () => {
      // Same level should be displayed
      assert(shouldLogLevel('info', 'info'))
      assert(shouldLogLevel('error', 'error'))

      // Higher level should be displayed
      assert(shouldLogLevel('error', 'info'))
      assert(shouldLogLevel('fatal', 'warn'))
      assert(shouldLogLevel('warn', 'debug'))

      // Lower level should not be displayed
      assert(!shouldLogLevel('debug', 'info'))
      assert(!shouldLogLevel('info', 'error'))
      assert(!shouldLogLevel('trace', 'fatal'))
    })

    it('should handle edge cases in level comparison', () => {
      // Test all combinations
      const levels: LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

      for (let i = 0; i < levels.length; i++) {
        for (let j = 0; j < levels.length; j++) {
          const currentLevel = levels[i]
          const minimumLevel = levels[j]
          const expected = i >= j
          assertEquals(
            shouldLogLevel(currentLevel, minimumLevel),
            expected,
            `shouldLogLevel(${currentLevel}, ${minimumLevel}) should be ${expected}`,
          )
        }
      }
    })
  })

  describe('Log Level Performance', () => {
    it('should perform level comparisons efficiently', () => {
      const start = performance.now()

      // Perform many comparisons
      for (let i = 0; i < 10000; i++) {
        shouldLogLevel('info', 'debug')
        shouldLogLevel('error', 'warn')
        shouldLogLevel('trace', 'fatal')
      }

      const duration = performance.now() - start
      assert(duration < 50, `Level comparisons took ${duration}ms, should be under 50ms`)
    })

    it('should access log level values efficiently', () => {
      const start = performance.now()

      // Perform many value lookups
      for (let i = 0; i < 10000; i++) {
        getLogLevelValue('info')
        getLogLevelValue('error')
        getLogLevelValue('debug')
      }

      const duration = performance.now() - start
      assert(duration < 50, `Level value lookups took ${duration}ms, should be under 50ms`)
    })
  })
})
