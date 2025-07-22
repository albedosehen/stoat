import { assert, assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { ENV_VAR_MAPPING, getEnvVarName, normalizeEnvValue, STOAT_ENV_PREFIX } from '../../types/environment.ts'

describe('Environment Variable System', () => {
  describe('Environment Variable Prefix', () => {
    it('should have environment variable prefix', () => {
      assertEquals(STOAT_ENV_PREFIX, 'STOAT_')
    })

    it('should be a consistent prefix', () => {
      assert(typeof STOAT_ENV_PREFIX === 'string')
      assert(STOAT_ENV_PREFIX.length > 0)
      assert(STOAT_ENV_PREFIX.endsWith('_'))
    })
  })

  describe('Environment Variable Mapping', () => {
    it('should map environment variables correctly', () => {
      // Test a few key mappings
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}LEVEL`], 'level')
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}SECURITY_ENABLED`], 'security.enabled')
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}ASYNC_LOGGING`], 'performance.enableAsyncLogging')
      assertEquals(ENV_VAR_MAPPING[`${STOAT_ENV_PREFIX}SERVICE_NAME`], 'observability.serviceName')
    })

    it('should have consistent environment variable prefix', () => {
      // All environment variables should start with the prefix
      Object.keys(ENV_VAR_MAPPING).forEach((envVar) => {
        assert(envVar.startsWith(STOAT_ENV_PREFIX))
      })
    })

    it('should have core configuration mappings', () => {
      // Test basic configuration mappings
      const coreVars = [
        `${STOAT_ENV_PREFIX}LEVEL`,
        `${STOAT_ENV_PREFIX}NAME`,
        `${STOAT_ENV_PREFIX}VERSION`,
      ]

      coreVars.forEach((envVar) => {
        assert(envVar in ENV_VAR_MAPPING, `Missing mapping for ${envVar}`)
      })
    })

    it('should have security configuration mappings', () => {
      const securityVars = [
        `${STOAT_ENV_PREFIX}SECURITY_ENABLED`,
        `${STOAT_ENV_PREFIX}SANITIZE_INPUTS`,
        `${STOAT_ENV_PREFIX}MAX_STRING_LENGTH`,
      ]

      securityVars.forEach((envVar) => {
        assert(envVar in ENV_VAR_MAPPING, `Missing security mapping for ${envVar}`)
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assert(mapping[envVar].startsWith('security.'))
      })
    })

    it('should have performance configuration mappings', () => {
      const performanceVars = [
        `${STOAT_ENV_PREFIX}ASYNC_LOGGING`,
        `${STOAT_ENV_PREFIX}SAMPLING_RATE`,
        `${STOAT_ENV_PREFIX}RATE_LIMIT`,
        `${STOAT_ENV_PREFIX}MEMORY_THRESHOLD`,
      ]

      performanceVars.forEach((envVar) => {
        assert(envVar in ENV_VAR_MAPPING, `Missing performance mapping for ${envVar}`)
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assert(mapping[envVar].startsWith('performance.'))
      })
    })

    it('should have observability configuration mappings', () => {
      const observabilityVars = [
        `${STOAT_ENV_PREFIX}OTEL_ENABLED`,
        `${STOAT_ENV_PREFIX}SERVICE_NAME`,
        `${STOAT_ENV_PREFIX}SERVICE_VERSION`,
        `${STOAT_ENV_PREFIX}ENVIRONMENT`,
        `${STOAT_ENV_PREFIX}EXPORT_ENDPOINT`,
      ]

      observabilityVars.forEach((envVar) => {
        assert(envVar in ENV_VAR_MAPPING, `Missing observability mapping for ${envVar}`)
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assert(mapping[envVar].startsWith('observability.'))
      })
    })

    it('should have context configuration mappings', () => {
      const contextVars = [
        `${STOAT_ENV_PREFIX}AUTO_CORRELATION`,
        `${STOAT_ENV_PREFIX}SESSION_ID_LENGTH`,
        `${STOAT_ENV_PREFIX}MAX_CONTEXT_SIZE`,
      ]

      contextVars.forEach((envVar) => {
        assert(envVar in ENV_VAR_MAPPING, `Missing context mapping for ${envVar}`)
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assert(mapping[envVar].startsWith('context.'))
      })
    })

    it('should have error boundary configuration mappings', () => {
      const errorBoundaryVars = [
        `${STOAT_ENV_PREFIX}ERROR_BOUNDARY`,
        `${STOAT_ENV_PREFIX}FALLBACK_CONSOLE`,
        `${STOAT_ENV_PREFIX}SUPPRESS_ERRORS`,
      ]

      errorBoundaryVars.forEach((envVar) => {
        assert(envVar in ENV_VAR_MAPPING, `Missing error boundary mapping for ${envVar}`)
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assert(mapping[envVar].startsWith('errorBoundary.'))
      })
    })
  })

  describe('Environment Value Normalization', () => {
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

    it('should handle boolean normalization case-insensitively', () => {
      const trueCases = ['true', 'TRUE', 'True', 'tRuE']
      const falseCases = ['false', 'FALSE', 'False', 'fAlSe']

      trueCases.forEach((input) => {
        assertEquals(normalizeEnvValue(input), true)
      })

      falseCases.forEach((input) => {
        assertEquals(normalizeEnvValue(input), false)
      })
    })

    it('should handle numeric string normalization', () => {
      const numericCases = [
        { input: '0', expected: 0 },
        { input: '123', expected: 123 },
        { input: '-456', expected: -456 },
        { input: '3.14159', expected: 3.14159 },
        { input: '-2.71', expected: -2.71 },
        { input: '1e5', expected: 100000 },
        { input: '1.5e-3', expected: 0.0015 },
      ]

      numericCases.forEach(({ input, expected }) => {
        const result = normalizeEnvValue(input)
        assertEquals(result, expected)
      })
    })

    it('should handle non-numeric, non-boolean strings', () => {
      const stringCases = [
        'hello world',
        'not-a-number',
        'maybe-true',
        'false-ish',
        '12.34.56',
        'null',
        'undefined',
      ]

      stringCases.forEach((input) => {
        const result = normalizeEnvValue(input)
        assertEquals(result, input)
        assert(typeof result === 'string')
      })

      // Empty string and space string are special cases - they get normalized to 0
      assertEquals(normalizeEnvValue(''), 0)
      assertEquals(normalizeEnvValue(' '), 0)
    })

    it('should handle edge cases in numeric parsing', () => {
      const edgeCases = [
        { input: 'NaN', expected: 'NaN' }, // Should remain string
        { input: 'Infinity', expected: Infinity },
        { input: '-Infinity', expected: -Infinity },
        { input: '0.0', expected: 0 },
        { input: '-0', expected: -0 },
      ]

      edgeCases.forEach(({ input, expected }) => {
        const result = normalizeEnvValue(input)
        if (input === 'NaN') {
          assertEquals(result, 'NaN') // Should remain string since NaN !== NaN
        } else {
          assertEquals(result, expected)
        }
      })
    })
  })

  describe('Environment Variable Name Resolution', () => {
    it('should find environment variable names for config paths', () => {
      assertEquals(getEnvVarName('level'), `${STOAT_ENV_PREFIX}LEVEL`)
      assertEquals(getEnvVarName('security.enabled'), `${STOAT_ENV_PREFIX}SECURITY_ENABLED`)
      assertEquals(getEnvVarName('nonexistent.path'), undefined)
    })

    it('should resolve all mapped configuration paths', () => {
      // Test reverse lookup for all mappings
      const configPaths = Object.values(ENV_VAR_MAPPING)

      configPaths.forEach((path) => {
        const envVarName = getEnvVarName(path)
        assert(envVarName !== undefined, `Could not resolve env var for config path: ${path}`)
        assert(envVarName!.startsWith(STOAT_ENV_PREFIX))
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assertEquals(mapping[envVarName!], path)
      })
    })

    it('should return undefined for unmapped paths', () => {
      const unmappedPaths = [
        'nonexistent',
        'fake.config.path',
        'security.unmapped',
        'performance.unknown',
        '',
        '   ',
      ]

      unmappedPaths.forEach((path) => {
        assertEquals(getEnvVarName(path), undefined)
      })
    })

    it('should handle nested configuration paths', () => {
      const nestedPaths = [
        'security.enabled',
        'performance.enableAsyncLogging',
        'observability.serviceName',
        'context.enableAutoCorrelation',
        'errorBoundary.enabled',
      ]

      nestedPaths.forEach((path) => {
        const envVarName = getEnvVarName(path)
        assert(envVarName !== undefined, `Failed to resolve nested path: ${path}`)
        assert(envVarName!.includes('_'))
        const mapping = ENV_VAR_MAPPING as Record<string, string>
        assert(mapping[envVarName!] === path)
      })
    })
  })

  describe('Environment System Performance', () => {
    it('should perform lookups efficiently', () => {
      const start = performance.now()

      // Perform many lookups
      for (let i = 0; i < 1000; i++) {
        getEnvVarName('level')
        getEnvVarName('security.enabled')
        getEnvVarName('performance.enableAsyncLogging')
        getEnvVarName('nonexistent.path')
      }

      const duration = performance.now() - start
      assert(duration < 50, `Environment lookups took ${duration}ms, should be under 50ms`)
    })

    it('should normalize values efficiently', () => {
      const start = performance.now()

      // Perform many normalizations
      for (let i = 0; i < 1000; i++) {
        normalizeEnvValue('true')
        normalizeEnvValue('42')
        normalizeEnvValue('hello')
        normalizeEnvValue('3.14')
      }

      const duration = performance.now() - start
      assert(duration < 50, `Value normalization took ${duration}ms, should be under 50ms`)
    })
  })

  describe('Environment System Validation', () => {
    it('should have valid mapping structure', () => {
      // Ensure mapping object is properly structured
      assert(typeof ENV_VAR_MAPPING === 'object')
      assert(ENV_VAR_MAPPING !== null)

      const keys = Object.keys(ENV_VAR_MAPPING)
      const values = Object.values(ENV_VAR_MAPPING)

      assert(keys.length > 0)
      assert(values.length === keys.length)

      // All keys should be strings starting with prefix
      keys.forEach((key) => {
        assert(typeof key === 'string')
        assert(key.startsWith(STOAT_ENV_PREFIX))
      })

      // All values should be strings (config paths)
      values.forEach((value) => {
        assert(typeof value === 'string')
        assert(value.length > 0)
      })
    })

    it('should have unique mappings', () => {
      const keys = Object.keys(ENV_VAR_MAPPING)
      const values = Object.values(ENV_VAR_MAPPING)

      // All environment variable names should be unique
      const uniqueKeys = new Set(keys)
      assertEquals(uniqueKeys.size, keys.length, 'Environment variable names should be unique')

      // All config paths should be unique
      const uniqueValues = new Set(values)
      assertEquals(uniqueValues.size, values.length, 'Config paths should be unique')
    })
  })
})
