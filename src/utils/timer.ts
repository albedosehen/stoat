import { type MemoryDelta } from '../types/memory.ts'
import { type PerformanceMetrics } from '../types/metrics.ts'

/**
 * Timer class for performance tracking in high-performance logging
 * Measures operation duration and memory usage delta
 * Now provides synchronous API without logger dependency
 */
export class Timer {
  private startTime: number
  private endTime?: number
  private memoryStart: Deno.MemoryUsage
  private memoryEnd?: Deno.MemoryUsage

  constructor(
    private operation: string,
  ) {
    this.startTime = performance.now()
    this.memoryStart = this.getMemoryUsage()
  }

  /**
   * Stop the timer and calculate performance metrics
   * @returns Performance metrics directly
   * @throws Error if timer calculation fails
   */
  stop(): PerformanceMetrics {
    this.endTime = performance.now()
    this.memoryEnd = this.getMemoryUsage()

    try {
      const metrics: PerformanceMetrics = {
        operation: this.operation,
        duration: this.endTime - this.startTime,
        memoryDelta: this.calculateMemoryDelta(),
        timestamp: new Date().toISOString(),
      }

      return metrics
    } catch (error) {
      throw new Error(`Timer calculation failed for operation '${this.operation}': ${error}`)
    }
  }

  /**
   * Get current memory usage from Deno runtime
   * @returns Current memory usage statistics
   */
  private getMemoryUsage(): Deno.MemoryUsage {
    return Deno.memoryUsage()
  }

  /**
   * Calculate memory usage delta between start and end measurements
   * @returns Memory delta in bytes for each category
   * @throws Error if timer has not been stopped
   */
  private calculateMemoryDelta(): MemoryDelta {
    if (!this.memoryEnd) {
      throw new Error('Timer not stopped')
    }

    return {
      rss: this.memoryEnd.rss - this.memoryStart.rss,
      heapUsed: this.memoryEnd.heapUsed - this.memoryStart.heapUsed,
      heapTotal: this.memoryEnd.heapTotal - this.memoryStart.heapTotal,
      external: this.memoryEnd.external - this.memoryStart.external,
    }
  }
}
