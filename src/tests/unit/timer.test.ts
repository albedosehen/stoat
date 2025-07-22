import {
  assert,
  assertEquals,
  assertExists,
  assertGreater,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertThrows,
} from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertSpyCalls, returnsNext, spy, type Stub, stub } from '@std/testing/mock'
import { Timer } from '../../services/timer.ts'
import { type StoatContext } from '../../stoat/context.ts'
import type { PerformanceMetrics } from '../../types/metrics.ts'
import { createRequestId } from '../../types/brands.ts'

// Test utilities
function createTestContext(overrides?: Partial<StoatContext>): StoatContext {
  return {
    sessionId: crypto.randomUUID(),
    symbol: 'TEST',
    orderId: 'test-order-123',
    strategy: 'test-strategy',
    ...overrides,
  }
}

function createMockMemoryUsage(overrides?: Partial<Deno.MemoryUsage>): Deno.MemoryUsage {
  return {
    rss: 1024 * 1024, // 1MB
    heapUsed: 512 * 1024, // 512KB
    heapTotal: 1024 * 1024, // 1MB
    external: 256 * 1024, // 256KB
    ...overrides,
  }
}

function simulateWork(durationMs: number): void {
  const start = performance.now()
  while (performance.now() - start < durationMs) {
    // Busy wait to simulate work
    Math.random()
  }
}

describe('Timer - Comprehensive Test Suite', () => {
  let testContext: StoatContext
  let performanceStub: Stub | undefined
  let memoryStub: Stub | undefined

  beforeEach(() => {
    testContext = createTestContext()
  })

  afterEach(() => {
    if (performanceStub) {
      performanceStub.restore()
      performanceStub = undefined
    }
    if (memoryStub) {
      memoryStub.restore()
      memoryStub = undefined
    }
  })

  describe('Timer Construction and Initialization', () => {
    it('should create timer with operation name and context', () => {
      const timer = new Timer('test-operation', testContext)

      assertExists(timer)
      assertEquals(typeof timer, 'object')
    })

    it('should create timer with different operation names', () => {
      const operations = ['data-fetch', 'order-processing', 'risk-calculation']

      operations.forEach((operation) => {
        const timer = new Timer(operation, testContext)
        assertExists(timer)
      })
    })

    it('should create timer with different contexts', () => {
      const contexts = [
        createTestContext({ symbol: 'AAPL' }),
        createTestContext({ symbol: 'GOOGL', strategy: 'momentum' }),
        createTestContext({ agentId: 'agent-123' }),
      ]

      contexts.forEach((context) => {
        const timer = new Timer('test-op', context)
        assertExists(timer)
      })
    })

    it('should handle empty operation name', () => {
      const timer = new Timer('', testContext)
      assertExists(timer)
    })

    it('should handle very long operation names', () => {
      const longName = 'a'.repeat(1000)
      const timer = new Timer(longName, testContext)
      assertExists(timer)
    })

    it('should handle special characters in operation name', () => {
      const specialName = 'test-op-🚀-émoji-ñ'
      const timer = new Timer(specialName, testContext)
      assertExists(timer)
    })
  })

  describe('Performance Timing Accuracy', () => {
    it('should measure duration correctly for short operations', () => {
      const timer = new Timer('short-operation', testContext)

      simulateWork(10) // 10ms

      const metrics = timer.stop()

      assertExists(metrics.duration)
      assertEquals(typeof metrics.duration, 'number')
      assertGreaterOrEqual(metrics.duration, 8) // Allow some tolerance
      assertLessOrEqual(metrics.duration, 50) // Upper bound for short operation
    })

    it('should measure duration correctly for medium operations', () => {
      const timer = new Timer('medium-operation', testContext)

      simulateWork(50) // 50ms

      const metrics = timer.stop()

      assertGreaterOrEqual(metrics.duration, 40)
      assertLessOrEqual(metrics.duration, 100)
    })

    it('should measure very short durations', () => {
      const timer = new Timer('instant-operation', testContext)

      // Stop immediately
      const metrics = timer.stop()

      assertExists(metrics.duration)
      assertGreaterOrEqual(metrics.duration, 0)
      assertLessOrEqual(metrics.duration, 10) // Should be very small
    })

    it('should provide consistent timing measurements', () => {
      const durations: number[] = []

      for (let i = 0; i < 5; i++) {
        const timer = new Timer(`consistency-test-${i}`, testContext)
        // No work, just measure timer overhead
        const metrics = timer.stop()
        durations.push(metrics.duration)
      }

      // All durations should be small and reasonably consistent
      durations.forEach((duration) => {
        assertGreaterOrEqual(duration, 0)
        assertLessOrEqual(duration, 5) // Timer overhead should be minimal
      })
    })

    it('should handle concurrent timer measurements', () => {
      const timers = Array.from({ length: 10 }, (_, i) => new Timer(`concurrent-${i}`, testContext))

      // Simulate work and collect results
      const results = timers.map((timer, index) => {
        simulateWork(5 + index) // Varying durations
        return timer.stop()
      })

      assertEquals(results.length, 10)
      results.forEach((metrics, index) => {
        assertEquals(metrics.operation, `concurrent-${index}`)
        assertGreaterOrEqual(metrics.duration, 0)
      })
    })
  })

  describe('Memory Usage Tracking', () => {
    it('should capture memory usage at start and end', () => {
      const memoryUsageSpy = spy(Deno, 'memoryUsage')

      const timer = new Timer('memory-test', testContext)
      const metrics = timer.stop()

      // Should call memoryUsage twice (start and end)
      assertSpyCalls(memoryUsageSpy, 2)
      assertExists(metrics.memoryDelta)

      memoryUsageSpy.restore()
    })

    it('should calculate memory delta correctly', () => {
      const startMemory = createMockMemoryUsage({
        rss: 1000,
        heapUsed: 500,
        heapTotal: 800,
        external: 200,
      })

      const endMemory = createMockMemoryUsage({
        rss: 1200,
        heapUsed: 600,
        heapTotal: 900,
        external: 250,
      })

      memoryStub = stub(Deno, 'memoryUsage', returnsNext([startMemory, endMemory]))

      const timer = new Timer('delta-test', testContext)
      const metrics = timer.stop()

      assertEquals(metrics.memoryDelta.rss, 200)
      assertEquals(metrics.memoryDelta.heapUsed, 100)
      assertEquals(metrics.memoryDelta.heapTotal, 100)
      assertEquals(metrics.memoryDelta.external, 50)
    })

    it('should handle negative memory deltas', () => {
      const startMemory = createMockMemoryUsage({
        rss: 1200,
        heapUsed: 600,
        heapTotal: 900,
        external: 250,
      })

      const endMemory = createMockMemoryUsage({
        rss: 1000,
        heapUsed: 500,
        heapTotal: 800,
        external: 200,
      })

      memoryStub = stub(Deno, 'memoryUsage', returnsNext([startMemory, endMemory]))

      const timer = new Timer('negative-delta-test', testContext)
      const metrics = timer.stop()

      assertEquals(metrics.memoryDelta.rss, -200)
      assertEquals(metrics.memoryDelta.heapUsed, -100)
      assertEquals(metrics.memoryDelta.heapTotal, -100)
      assertEquals(metrics.memoryDelta.external, -50)
    })

    it('should handle zero memory deltas', () => {
      const memory = createMockMemoryUsage()

      memoryStub = stub(Deno, 'memoryUsage', () => memory) // Same memory for both calls

      const timer = new Timer('zero-delta-test', testContext)
      const metrics = timer.stop()

      assertEquals(metrics.memoryDelta.rss, 0)
      assertEquals(metrics.memoryDelta.heapUsed, 0)
      assertEquals(metrics.memoryDelta.heapTotal, 0)
      assertEquals(metrics.memoryDelta.external, 0)
    })

    it('should handle large memory values', () => {
      const startMemory = createMockMemoryUsage({
        rss: 2 ** 30, // 1GB
        heapUsed: 2 ** 29, // 512MB
        heapTotal: 2 ** 30, // 1GB
        external: 2 ** 28, // 256MB
      })

      const endMemory = createMockMemoryUsage({
        rss: 2 ** 30 + 1000000, // 1GB + 1MB
        heapUsed: 2 ** 29 + 500000, // 512MB + 500KB
        heapTotal: 2 ** 30 + 1000000, // 1GB + 1MB
        external: 2 ** 28 + 250000, // 256MB + 250KB
      })

      memoryStub = stub(Deno, 'memoryUsage', returnsNext([startMemory, endMemory]))

      const timer = new Timer('large-memory-test', testContext)
      const metrics = timer.stop()

      assertEquals(metrics.memoryDelta.rss, 1000000)
      assertEquals(metrics.memoryDelta.heapUsed, 500000)
      assertEquals(metrics.memoryDelta.heapTotal, 1000000)
      assertEquals(metrics.memoryDelta.external, 250000)
    })
  })

  describe('Stop Method and PerformanceMetrics', () => {
    it('should return complete PerformanceMetrics object', () => {
      const timer = new Timer('complete-metrics-test', testContext)
      const metrics = timer.stop()

      assertExists(metrics.operation)
      assertExists(metrics.duration)
      assertExists(metrics.memoryDelta)
      assertExists(metrics.timestamp)

      assertEquals(typeof metrics.operation, 'string')
      assertEquals(typeof metrics.duration, 'number')
      assertEquals(typeof metrics.memoryDelta, 'object')
      assertEquals(typeof metrics.timestamp, 'string')
    })

    it('should preserve operation name in metrics', () => {
      const operationName = 'preserve-name-test'
      const timer = new Timer(operationName, testContext)
      const metrics = timer.stop()

      assertEquals(metrics.operation, operationName)
    })

    it('should generate valid ISO timestamp', () => {
      const timer = new Timer('timestamp-test', testContext)
      const metrics = timer.stop()

      // Should be valid ISO string
      const timestamp = new Date(metrics.timestamp)
      assert(!isNaN(timestamp.getTime()))

      // Should be recent (within last second)
      const now = new Date()
      const timeDiff = now.getTime() - timestamp.getTime()
      assertLessOrEqual(timeDiff, 1000) // Within 1 second
    })

    it('should include complete memory delta object', () => {
      const timer = new Timer('memory-delta-test', testContext)
      const metrics = timer.stop()

      assertExists(metrics.memoryDelta.rss)
      assertExists(metrics.memoryDelta.heapUsed)
      assertExists(metrics.memoryDelta.heapTotal)
      assertExists(metrics.memoryDelta.external)

      assertEquals(typeof metrics.memoryDelta.rss, 'number')
      assertEquals(typeof metrics.memoryDelta.heapUsed, 'number')
      assertEquals(typeof metrics.memoryDelta.heapTotal, 'number')
      assertEquals(typeof metrics.memoryDelta.external, 'number')
    })

    it('should allow multiple stop calls without error', () => {
      const timer = new Timer('multiple-stop-test', testContext)

      const metrics1 = timer.stop()
      const metrics2 = timer.stop()
      const metrics3 = timer.stop()

      // All calls should succeed and return valid metrics
      assertExists(metrics1)
      assertExists(metrics2)
      assertExists(metrics3)

      // Operation names should be consistent
      assertEquals(metrics1.operation, 'multiple-stop-test')
      assertEquals(metrics2.operation, 'multiple-stop-test')
      assertEquals(metrics3.operation, 'multiple-stop-test')
    })

    it('should provide accurate timing after multiple stops', () => {
      const timer = new Timer('multiple-timing-test', testContext)

      const metrics1 = timer.stop()

      // Wait a bit
      const waitStart = performance.now()
      while (performance.now() - waitStart < 5) {
        Math.random()
      }

      const metrics2 = timer.stop()

      // Second stop should have longer duration than first
      assertGreaterOrEqual(metrics2.duration, metrics1.duration)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle performance.now() precision limits', () => {
      // Create many timers in rapid succession to test precision
      const timers = []
      for (let i = 0; i < 100; i++) {
        timers.push(new Timer(`precision-test-${i}`, testContext))
      }

      const results = timers.map((timer) => timer.stop())

      // All should succeed
      assertEquals(results.length, 100)
      results.forEach((metrics) => {
        assertGreaterOrEqual(metrics.duration, 0)
      })
    })

    it('should handle Deno.memoryUsage() errors gracefully', () => {
      memoryStub = stub(Deno, 'memoryUsage', () => {
        throw new Error('Memory access denied')
      })

      assertThrows(
        () => new Timer('memory-error-test', testContext),
        Error,
        'Memory access denied',
      )
    })

    it('should handle edge case timing values', () => {
      // Mock performance.now to return very close values
      performanceStub = stub(performance, 'now', returnsNext([1000.0001, 1000.0002]))

      const timer = new Timer('tiny-duration-test', testContext)
      const metrics = timer.stop()

      assertExists(metrics.duration)
      // Use tolerance for floating-point comparison
      const expected = 0.0001
      const tolerance = 0.0000001
      assert(
        Math.abs(metrics.duration - expected) < tolerance,
        `Expected ${expected}, got ${metrics.duration}, difference: ${Math.abs(metrics.duration - expected)}`,
      )
    })

    it('should handle large duration values', () => {
      // Mock performance.now to return very different values
      performanceStub = stub(performance, 'now', returnsNext([0, 24 * 60 * 60 * 1000]))

      const timer = new Timer('large-duration-test', testContext)
      const metrics = timer.stop()

      assertExists(metrics.duration)
      assertEquals(metrics.duration, 24 * 60 * 60 * 1000)
    })
  })

  describe('Memory Measurement Validation', () => {
    it('should capture realistic memory values', () => {
      const timer = new Timer('realistic-memory-test', testContext)
      const metrics = timer.stop()

      // Memory values should be within reasonable ranges
      const { memoryDelta } = metrics

      // RSS should be reasonable (not negative infinity or positive infinity)
      assert(Number.isFinite(memoryDelta.rss))
      assert(Number.isFinite(memoryDelta.heapUsed))
      assert(Number.isFinite(memoryDelta.heapTotal))
      assert(Number.isFinite(memoryDelta.external))
    })

    it('should handle edge case memory values', () => {
      const edgeCaseMemory = createMockMemoryUsage({
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      })

      memoryStub = stub(Deno, 'memoryUsage', () => edgeCaseMemory)

      const timer = new Timer('edge-memory-test', testContext)
      const metrics = timer.stop()

      assertEquals(metrics.memoryDelta.rss, 0)
      assertEquals(metrics.memoryDelta.heapUsed, 0)
      assertEquals(metrics.memoryDelta.heapTotal, 0)
      assertEquals(metrics.memoryDelta.external, 0)
    })

    it('should validate memory delta calculations', () => {
      const scenarios = [
        {
          start: createMockMemoryUsage({ rss: 1000, heapUsed: 500, heapTotal: 800, external: 200 }),
          end: createMockMemoryUsage({ rss: 1500, heapUsed: 750, heapTotal: 1000, external: 300 }),
          expected: { rss: 500, heapUsed: 250, heapTotal: 200, external: 100 },
        },
        {
          start: createMockMemoryUsage({ rss: 2000, heapUsed: 1000, heapTotal: 1500, external: 500 }),
          end: createMockMemoryUsage({ rss: 1800, heapUsed: 900, heapTotal: 1400, external: 450 }),
          expected: { rss: -200, heapUsed: -100, heapTotal: -100, external: -50 },
        },
      ]

      scenarios.forEach((scenario, index) => {
        // Clean up any existing stub
        if (memoryStub) {
          memoryStub.restore()
        }

        memoryStub = stub(Deno, 'memoryUsage', returnsNext([scenario.start, scenario.end]))

        const timer = new Timer(`validation-test-${index}`, testContext)
        const metrics = timer.stop()

        assertEquals(metrics.memoryDelta.rss, scenario.expected.rss)
        assertEquals(metrics.memoryDelta.heapUsed, scenario.expected.heapUsed)
        assertEquals(metrics.memoryDelta.heapTotal, scenario.expected.heapTotal)
        assertEquals(metrics.memoryDelta.external, scenario.expected.external)
      })
    })
  })

  describe('Integration and Real-world Scenarios', () => {
    it('should accurately measure actual work performance', () => {
      const timer = new Timer('real-work-test', testContext)

      // Perform actual work
      const data = Array.from({ length: 10000 }, (_, i) => i * 2)
      const result = data.reduce((sum, val) => sum + val, 0)

      const metrics = timer.stop()

      assertExists(result) // Ensure work was done
      assertGreater(metrics.duration, 0)
      assertExists(metrics.memoryDelta)
    })

    it('should handle memory-intensive operations', () => {
      const timer = new Timer('memory-intensive-test', testContext)

      // Create and destroy large arrays to affect memory
      const arrays = []
      for (let i = 0; i < 100; i++) {
        arrays.push(new Array(1000).fill(Math.random()))
      }

      // Clear arrays
      arrays.length = 0

      const metrics = timer.stop()

      assertExists(metrics.memoryDelta)
      assert(Number.isFinite(metrics.memoryDelta.heapUsed))
    })

    it('should provide consistent results across multiple measurements', () => {
      const results: PerformanceMetrics[] = []

      for (let i = 0; i < 10; i++) {
        const timer = new Timer(`consistency-${i}`, testContext)

        // Consistent work
        Math.sqrt(12345)

        results.push(timer.stop())
      }

      // All results should be valid and reasonably consistent
      results.forEach((metrics, index) => {
        assertEquals(metrics.operation, `consistency-${index}`)
        assertGreaterOrEqual(metrics.duration, 0)
        assertLessOrEqual(metrics.duration, 10) // Should be very fast
        assertExists(metrics.memoryDelta)
      })
    })

    it('should work correctly with different context types', () => {
      const contexts = [
        createTestContext({ symbol: 'AAPL', strategy: 'momentum' }),
        createTestContext({ agentId: 'agent-123', portfolioId: 'port-456' }),
        createTestContext({ requestId: createRequestId('req-789') }),
      ]

      contexts.forEach((context, index) => {
        const timer = new Timer(`context-test-${index}`, context)
        const metrics = timer.stop()

        assertEquals(metrics.operation, `context-test-${index}`)
        assertExists(metrics.duration)
        assertExists(metrics.memoryDelta)
      })
    })
  })
})
