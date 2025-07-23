import { assert, assertEquals, assertExists, assertGreater, assertLess, assertThrows } from '@std/assert'
import { beforeEach, describe, it } from '@std/testing/bdd'
import {
  compareLevels,
  createCustomLevel,
  type CustomLogLevel,
  getGlobalLevelManager,
  getLevelValue,
  isValidLevelName,
  type LevelFilter,
  LogLevelManager,
  type TimeBasedFilter,
} from '../../loggers/services/mod.ts'
import { LOG_LEVEL_VALUES } from '../../types/logLevels.ts'

describe('Custom Level Management System', () => {
  let levelManager: LogLevelManager

  beforeEach(() => {
    levelManager = new LogLevelManager()
  })

  describe('Level Manager Creation and Configuration', () => {
    it('should create level manager with default levels', () => {
      const allLevels = levelManager.getAllLevels()

      // Should include standard levels
      assert(allLevels.some((level: CustomLogLevel) => level.name === 'trace'))
      assert(allLevels.some((level: CustomLogLevel) => level.name === 'debug'))
      assert(allLevels.some((level: CustomLogLevel) => level.name === 'info'))
      assert(allLevels.some((level: CustomLogLevel) => level.name === 'warn'))
      assert(allLevels.some((level: CustomLogLevel) => level.name === 'error'))
      assert(allLevels.some((level: CustomLogLevel) => level.name === 'fatal'))
    })

    it('should get level value by name', () => {
      const infoValue = levelManager.getLevelValue('info')
      assertExists(infoValue)
      assertEquals(infoValue, LOG_LEVEL_VALUES.info)
    })

    it('should get level name by value', () => {
      const levelName = levelManager.getLevelName(LOG_LEVEL_VALUES.error)
      assertExists(levelName)
      assertEquals(levelName, 'error')
    })

    it('should check if level exists', () => {
      assert(levelManager.hasLevel('info'))
      assert(levelManager.hasLevel('error'))
      assert(!levelManager.hasLevel('NONEXISTENT'))
    })

    it('should get sorted level names', () => {
      const sortedNames = levelManager.getSortedLevelNames()
      assertExists(sortedNames)
      assert(Array.isArray(sortedNames))

      // Should be sorted by value
      for (let i = 1; i < sortedNames.length; i++) {
        const prevValue = levelManager.getLevelValue(sortedNames[i - 1])!
        const currValue = levelManager.getLevelValue(sortedNames[i])!
        assertLess(prevValue, currValue)
      }
    })
  })

  describe('Custom Level Creation', () => {
    it('should add custom level with valid configuration', () => {
      const customLevel: CustomLogLevel = {
        name: 'BUSINESS',
        value: 450,
        description: 'Business logic events',
        color: 'blue',
        enabled: true,
        aliases: ['biz', 'business'],
      }

      // Should not throw
      levelManager.addLevel(customLevel)

      // Should be able to find the level
      assert(levelManager.hasLevel('BUSINESS'))
      assertEquals(levelManager.getLevelValue('BUSINESS'), 450)
      assertEquals(levelManager.getLevelName(450), 'BUSINESS')
    })

    it('should reject duplicate level names', () => {
      const customLevel: CustomLogLevel = {
        name: 'info', // Duplicate of standard level
        value: 250,
        enabled: true,
      }

      assertThrows(
        () => levelManager.addLevel(customLevel),
        Error,
        'already exists',
      )
    })

    it('should reject duplicate level values', () => {
      const customLevel: CustomLogLevel = {
        name: 'DUPLICATE_VALUE',
        value: LOG_LEVEL_VALUES.info, // Duplicate value
        enabled: true,
      }

      assertThrows(
        () => levelManager.addLevel(customLevel),
        Error,
        'already used',
      )
    })

    it('should reject invalid level names', () => {
      const invalidLevel: CustomLogLevel = {
        name: '', // Empty name
        value: 350,
        enabled: true,
      }

      assertThrows(
        () => levelManager.addLevel(invalidLevel),
        Error,
        'non-empty string',
      )
    })

    it('should reject invalid level values', () => {
      const invalidLevel: CustomLogLevel = {
        name: 'INVALID_VALUE',
        value: -1, // Negative value
        enabled: true,
      }

      assertThrows(
        () => levelManager.addLevel(invalidLevel),
        Error,
        'non-negative number',
      )
    })

    it('should handle aliases correctly', () => {
      const customLevel: CustomLogLevel = {
        name: 'CUSTOM',
        value: 350,
        enabled: true,
        aliases: ['custom', 'cust'],
      }

      levelManager.addLevel(customLevel)

      // Should be able to find level by aliases
      assertEquals(levelManager.getLevelValue('custom'), 350)
      assertEquals(levelManager.getLevelValue('cust'), 350)
      assertEquals(levelManager.getLevelValue('CUSTOM'), 350)
    })

    it('should add multiple custom levels', () => {
      const customLevels: CustomLogLevel[] = [
        { name: 'AUDIT', value: 250, enabled: true },
        { name: 'SECURITY', value: 550, enabled: true },
        { name: 'PERFORMANCE', value: 150, enabled: true },
      ]

      levelManager.addCustomLevels(customLevels)

      customLevels.forEach((level) => {
        assert(levelManager.hasLevel(level.name))
        assertEquals(levelManager.getLevelValue(level.name), level.value)
      })
    })
  })

  describe('Level Modification and Removal', () => {
    beforeEach(() => {
      // Add a test custom level
      levelManager.addLevel({
        name: 'TEST_LEVEL',
        value: 375,
        enabled: true,
        description: 'Test level for modification',
      })
    })

    it('should enable/disable levels', () => {
      // Initially enabled
      assert(levelManager.isLevelEnabled('TEST_LEVEL'))

      // Disable level
      levelManager.setLevelEnabled('TEST_LEVEL', false)
      assert(!levelManager.isLevelEnabled('TEST_LEVEL'))

      // Re-enable level
      levelManager.setLevelEnabled('TEST_LEVEL', true)
      assert(levelManager.isLevelEnabled('TEST_LEVEL'))
    })

    it('should remove custom level', () => {
      const success = levelManager.removeLevel('TEST_LEVEL')
      assertEquals(success, true)

      assert(!levelManager.hasLevel('TEST_LEVEL'))
    })

    it('should not remove standard levels', () => {
      assertThrows(
        () => levelManager.removeLevel('info'),
        Error,
        'Cannot remove standard level',
      )

      // Should still exist
      assert(levelManager.hasLevel('info'))
    })

    it('should not remove non-existent levels', () => {
      const success = levelManager.removeLevel('NONEXISTENT')
      assertEquals(success, false)
    })

    it('should handle dynamic level overrides', () => {
      // Set dynamic level override
      levelManager.setDynamicLevel('info', 999)
      assertEquals(levelManager.getLevelValue('info'), 999)

      // Clear dynamic level override
      const cleared = levelManager.clearDynamicLevel('info')
      assertEquals(cleared, true)
      assertEquals(levelManager.getLevelValue('info'), LOG_LEVEL_VALUES.info)
    })
  })

  describe('Level Comparison and Filtering', () => {
    beforeEach(() => {
      // Add some custom levels for testing
      levelManager.addLevel({ name: 'AUDIT', value: 250, enabled: true })
      levelManager.addLevel({ name: 'SECURITY', value: 550, enabled: true })
      levelManager.addLevel({ name: 'PERFORMANCE', value: 150, enabled: true })
    })

    it('should compare levels correctly', () => {
      // debug < info < warn < error
      assert(levelManager.compareLevels('debug', 'info') < 0)
      assert(levelManager.compareLevels('info', 'debug') > 0)
      assert(levelManager.compareLevels('info', 'info') === 0)
      assert(levelManager.compareLevels('error', 'info') > 0)
    })

    it('should check minimum level threshold', () => {
      assert(levelManager.meetsMinLevel('error', 'info')) // error >= info
      assert(levelManager.meetsMinLevel('info', 'info')) // info >= info
      assert(!levelManager.meetsMinLevel('debug', 'info')) // debug < info
    })

    it('should throw on invalid level comparison', () => {
      assertThrows(
        () => levelManager.compareLevels('INVALID', 'info'),
        Error,
        'Invalid level for comparison',
      )
    })
  })

  describe('Level Filtering System', () => {
    beforeEach(() => {
      // Add custom levels for filtering tests
      levelManager.addLevel({ name: 'HTTP_REQUEST', value: 275, enabled: true })
      levelManager.addLevel({ name: 'HTTP_RESPONSE', value: 285, enabled: true })
      levelManager.addLevel({ name: 'DATABASE', value: 450, enabled: true })
    })

    it('should set and get filters', () => {
      const filters: LevelFilter = {
        minLevel: 'info',
        maxLevel: 'error',
        allowedLevels: ['info', 'warn', 'error'],
      }

      levelManager.setFilters(filters)
      const retrievedFilters = levelManager.getFilters()

      assertEquals(retrievedFilters.minLevel, 'info')
      assertEquals(retrievedFilters.maxLevel, 'error')
      assertEquals(retrievedFilters.allowedLevels?.length, 3)
    })

    it('should update filters partially', () => {
      // Set initial filters
      levelManager.setFilters({ minLevel: 'debug' })

      // Update with additional filters
      levelManager.updateFilters({ maxLevel: 'warn' })

      const filters = levelManager.getFilters()
      assertEquals(filters.minLevel, 'debug')
      assertEquals(filters.maxLevel, 'warn')
    })

    it('should validate filter configurations', () => {
      // Invalid min level
      assertThrows(
        () => levelManager.setFilters({ minLevel: 'INVALID' }),
        Error,
        'does not exist',
      )

      // Min level higher than max level
      assertThrows(
        () => levelManager.setFilters({ minLevel: 'error', maxLevel: 'info' }),
        Error,
        'cannot be higher than maximum',
      )
    })

    it('should check if levels pass filters', () => {
      levelManager.setFilters({
        minLevel: 'info',
        maxLevel: 'error',
      })

      assert(levelManager.passesFilters('info'))
      assert(levelManager.passesFilters('warn'))
      assert(levelManager.passesFilters('error'))
      assert(!levelManager.passesFilters('debug')) // Below min
      assert(!levelManager.passesFilters('fatal')) // Above max
    })

    it('should handle blocked levels', () => {
      levelManager.setFilters({
        blockedLevels: ['debug', 'trace'],
      })

      assert(!levelManager.passesFilters('debug'))
      assert(!levelManager.passesFilters('trace'))
      assert(levelManager.passesFilters('info'))
    })

    it('should handle allowed levels whitelist', () => {
      levelManager.setFilters({
        allowedLevels: ['info', 'error'],
      })

      assert(levelManager.passesFilters('info'))
      assert(levelManager.passesFilters('error'))
      assert(!levelManager.passesFilters('debug'))
      assert(!levelManager.passesFilters('warn'))
    })

    it('should handle component-specific filters', () => {
      levelManager.setFilters({
        componentFilters: {
          'http': ['HTTP_REQUEST', 'HTTP_RESPONSE'],
          'database': ['DATABASE', 'error'],
        },
      })

      assert(levelManager.passesFilters('HTTP_REQUEST', 'http'))
      assert(!levelManager.passesFilters('info', 'http'))
      assert(levelManager.passesFilters('DATABASE', 'database'))
      assert(!levelManager.passesFilters('info', 'database'))
    })

    it('should clear filters', () => {
      levelManager.setFilters({ minLevel: 'warn' })
      levelManager.clearFilters()

      const filters = levelManager.getFilters()
      assertEquals(Object.keys(filters).length, 0)
    })
  })

  describe('Time-Based Filtering', () => {
    it('should handle time-based filters', () => {
      const timeFilters: TimeBasedFilter[] = [
        {
          startTime: '09:00',
          endTime: '17:00',
          levels: ['info', 'warn', 'error'],
          enabled: true,
        },
        {
          startTime: '18:00',
          endTime: '08:00',
          levels: ['error', 'fatal'],
          enabled: true,
        },
      ]

      levelManager.setFilters({ timeBasedFilters: timeFilters })

      // Note: This test will depend on current time, so we mainly test structure
      const filters = levelManager.getFilters()
      assertEquals(filters.timeBasedFilters?.length, 2)
    })
  })

  describe('Configuration Import/Export', () => {
    it('should export configuration', () => {
      // Add custom level and filters
      levelManager.addLevel({ name: 'CUSTOM', value: 350, enabled: true })
      levelManager.setFilters({ minLevel: 'info' })
      levelManager.setDynamicLevel('debug', 999)

      const config = levelManager.exportConfig()

      assertExists(config.customLevels)
      assertExists(config.filters)
      assertExists(config.dynamicLevels)

      assert(config.customLevels.some((level: CustomLogLevel) => level.name === 'CUSTOM'))
      assertEquals(config.filters.minLevel, 'info')
      assertEquals(config.dynamicLevels.debug, 999)
    })

    it('should import configuration', () => {
      const config = {
        customLevels: [
          { name: 'IMPORTED', value: 375, enabled: true },
        ],
        filters: { maxLevel: 'warn' },
        dynamicLevels: { info: 888 },
      }

      levelManager.importConfig(config)

      assert(levelManager.hasLevel('IMPORTED'))
      assertEquals(levelManager.getLevelValue('IMPORTED'), 375)
      assertEquals(levelManager.getFilters().maxLevel, 'warn')
      assertEquals(levelManager.getLevelValue('info'), 888)
    })
  })

  describe('Utility Functions', () => {
    it('should create custom level with factory function', () => {
      const customLevel = createCustomLevel('FACTORY_LEVEL', 375, {
        description: 'Created with factory',
        color: 'purple',
      })

      assertExists(customLevel)
      assertEquals(customLevel.name, 'FACTORY_LEVEL')
      assertEquals(customLevel.value, 375)
      assertEquals(customLevel.description, 'Created with factory')
      assertEquals(customLevel.color, 'purple')
      assertEquals(customLevel.enabled, true)
    })

    it('should validate level names', () => {
      assert(isValidLevelName('info'))
      assert(isValidLevelName('error'))
      assert(!isValidLevelName('INVALID'))
    })

    it('should compare levels using utility function', () => {
      assert(compareLevels('debug', 'info') < 0)
      assert(compareLevels('error', 'info') > 0)
      assert(compareLevels('info', 'info') === 0)
    })

    it('should get level value using utility function', () => {
      const value = getLevelValue('info')
      assertEquals(value, LOG_LEVEL_VALUES.info)

      const invalidValue = getLevelValue('INVALID')
      assertEquals(invalidValue, undefined)
    })

    it('should get global level manager', () => {
      const manager1 = getGlobalLevelManager()
      const manager2 = getGlobalLevelManager()

      // Should return same instance
      assertEquals(manager1, manager2)
    })

    it('should create new global manager with custom levels', () => {
      const customLevels: CustomLogLevel[] = [
        { name: 'GLOBAL_CUSTOM', value: 350, enabled: true },
      ]

      const manager = getGlobalLevelManager(customLevels)
      assert(manager.hasLevel('GLOBAL_CUSTOM'))
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid level operations', () => {
      // Try to enable non-existent level
      assertThrows(
        () => levelManager.setLevelEnabled('NONEXISTENT', true),
        Error,
        'not found',
      )
    })

    it('should handle invalid aliases', () => {
      const invalidLevel: CustomLogLevel = {
        name: 'TEST',
        value: 350,
        enabled: true,
        aliases: [''], // Empty alias
      }

      assertThrows(
        () => levelManager.addLevel(invalidLevel),
        Error,
        'non-empty strings',
      )
    })

    it('should handle level manager with many custom levels', () => {
      // Add many custom levels to test performance
      for (let i = 0; i < 50; i++) {
        levelManager.addLevel({
          name: `CUSTOM_${i}`,
          value: 350 + i,
          enabled: true,
        })
      }

      const allLevels = levelManager.getAllLevels()
      assertGreater(allLevels.length, 50) // Should include standard + custom levels

      // Should still be able to find specific levels
      assert(levelManager.hasLevel('CUSTOM_25'))
      assertEquals(levelManager.getLevelValue('CUSTOM_25'), 375)
    })

    it('should handle concurrent level operations', () => {
      // Test that level manager remains consistent during operations
      const operations = []

      for (let i = 0; i < 10; i++) {
        operations.push(() => {
          levelManager.addLevel({
            name: `CONCURRENT_${i}`,
            value: 500 + i,
            enabled: true,
          })
        })
        operations.push(() => {
          levelManager.hasLevel(`CONCURRENT_${i}`)
        })
      }

      // Execute all operations
      operations.forEach((op) => op())

      // Verify final state is consistent
      for (let i = 0; i < 10; i++) {
        assert(levelManager.hasLevel(`CONCURRENT_${i}`))
        assertEquals(levelManager.getLevelValue(`CONCURRENT_${i}`), 500 + i)
      }
    })
  })
})
