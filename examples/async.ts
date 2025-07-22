/**
 * Async Logging Examples
 * Demonstrates high-performance async logging with trading optimizations
 */

import { stoat } from '../mod.ts'
import {
  createAsyncLogger,
  ASYNC_CONFIGS,
} from '../src/loggers/async-logger.ts'
import {
  createStructuredLogger,
  type StructuredLogEntry
} from '../src/loggers/structured-log-entry.ts'
import {
  createSymbol
} from '../src/types/brands.ts'

const logger = stoat.create({ module: 'async-examples' })
const outputLogger = stoat.create({ module: 'async-output' })
const perfLogger = stoat.create({ module: 'async-perf' })

logger.info('1. Basic Async Logging Setup')

let entryCount = 0
const syncCallback = (entry: StructuredLogEntry) => {
  outputLogger.info(`[ASYNC ${++entryCount}] ${entry.level}: ${entry.message}`)
}

const basicAsyncLogger = createAsyncLogger(ASYNC_CONFIGS.development, syncCallback)
const structuredLogger = createStructuredLogger()

for (let i = 0; i < 5; i++) {
  const entry = structuredLogger.createLogEntry({
    level: 'info',
    message: `Async log entry ${i}`,
    data: { iteration: i, timestamp: Date.now() }
  })
  
  await basicAsyncLogger.log(entry)
}

await basicAsyncLogger.flush()

logger.info('---')
logger.info('2. High-Frequency Trading Async Logging')

const hftAsyncLogger = createAsyncLogger(ASYNC_CONFIGS.trading, (entry: StructuredLogEntry) => {
  outputLogger.info(`[HFT] ${entry.level}: ${entry.message}`)
})

const symbols = ['NVDA', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']

logger.info('Processing market data...')

const startTime = performance.now()

for (let i = 0; i < 1000; i++) {
  const symbol = symbols[i % symbols.length]
  const entry = structuredLogger.createLogEntry({
    level: 'info',
    message: `Market tick processed`,
    data: {
      symbol: createSymbol(symbol),
      price: 100 + Math.random() * 50,
      volume: Math.floor(Math.random() * 10000),
      tickId: i
    }
  })
  
  await hftAsyncLogger.log(entry)
}

await hftAsyncLogger.flush()
const endTime = performance.now()

perfLogger.info('HFT logging completed', {
  entriesProcessed: 1000,
  durationMs: parseFloat((endTime - startTime).toFixed(2)),
  throughput: Math.round(1000 / ((endTime - startTime) / 1000))
})

logger.info('---')
logger.info('3. Async Logger Metrics')

const metrics = hftAsyncLogger.getMetrics()
perfLogger.info('Performance metrics:', {
  entriesBuffered: metrics.entriesBuffered,
  entriesFlushed: metrics.entriesFlushed,
  entriesDropped: metrics.entriesDropped,
  flushCount: metrics.flushCount,
  averageFlushTimeMs: parseFloat(metrics.averageFlushTime.toFixed(2)),
  bufferUtilizationPercent: parseFloat((metrics.bufferUtilization * 100).toFixed(1)),
  backpressureEvents: metrics.backpressureEvents,
  syncFallbackEvents: metrics.syncFallbackEvents,
  errorCount: metrics.errorCount
})

logger.info('---')
logger.info('4. Custom Async Configuration')

const customConfig = {
  bufferSize: 500,
  maxBufferSize: 2000,
  flushInterval: 200, // 200ms
  batchSize: 50,
  syncOnExit: true,
  enableBackpressure: true,
  maxRetries: 2,
  retryDelay: 25,
  priorityLevels: {
    trace: 5,
    debug: 10,
    info: 20,
    warn: 40,
    error: 60,
    fatal: 100
  },
  syncFallback: true,
  syncThreshold: 10 * 1024 * 1024 // 10MB
}

const customAsyncLogger = createAsyncLogger(customConfig, (entry: StructuredLogEntry) => {
  outputLogger.info(`[CUSTOM] ${entry.level.toUpperCase()}: ${entry.message}`)
})

const priorities = [
  { level: 'debug' as const, message: 'Low priority debug message' },
  { level: 'info' as const, message: 'Normal priority info message' },
  { level: 'warn' as const, message: 'Medium priority warning' },
  { level: 'error' as const, message: 'High priority error' },
  { level: 'fatal' as const, message: 'Critical priority fatal error' }
]

for (const { level, message } of priorities) {
  const entry = structuredLogger.createLogEntry({
    level,
    message,
    data: { priority: customConfig.priorityLevels[level] }
  })
  
  await customAsyncLogger.log(entry)
}

await customAsyncLogger.flush()

logger.info('---')
logger.info('5. Sync Mode Fallback')

const fallbackLogger = createAsyncLogger(ASYNC_CONFIGS.web, (entry: StructuredLogEntry) => {
  outputLogger.info(`[FALLBACK] ${entry.level}: ${entry.message}`)
})

fallbackLogger.enableSyncMode()
logger.info('Sync mode enabled', { syncModeEnabled: fallbackLogger.isSyncMode() })

const criticalEntry = structuredLogger.createLogEntry({
  level: 'fatal',
  message: 'Critical system failure - immediate processing required',
  data: { 
    errorCode: 'SYS_CRITICAL_001',
    systemState: 'failing',
    requiresImmediate: true
  }
})

await fallbackLogger.log(criticalEntry)

fallbackLogger.disableSyncMode()
logger.info('Sync mode disabled', { syncModeEnabled: fallbackLogger.isSyncMode() })

logger.info('---')
logger.info('6. Batch Processing')

const batchLogger = createAsyncLogger({
  ...ASYNC_CONFIGS.web,
  batchSize: 3, // Small batch for demo
  flushInterval: 100
}, (entry: StructuredLogEntry) => {
  outputLogger.info(`[BATCH] ${entry.level}: ${entry.message}`)
})

logger.info('Adding entries to batch...')
for (let i = 0; i < 7; i++) {
  const entry = structuredLogger.createLogEntry({
    level: 'info',
    message: `Batch entry ${i + 1}`,
    data: { batchIndex: i, timestamp: Date.now() }
  })
  
  await batchLogger.log(entry)
  await new Promise(resolve => setTimeout(resolve, 20))
}

await batchLogger.flush()

logger.info('---')
logger.info('7. Runtime Configuration Updates')

const runtimeLogger = createAsyncLogger(ASYNC_CONFIGS.development, (entry: StructuredLogEntry) => {
  outputLogger.info(`[RUNTIME] ${entry.level}: ${entry.message}`)
})

logger.info('Initial configuration:')
const initialMetrics = runtimeLogger.getMetrics()
perfLogger.info('Initial buffer utilization', {
  bufferUtilizationPercent: parseFloat((initialMetrics.bufferUtilization * 100).toFixed(1))
})

runtimeLogger.updateConfig({
  flushInterval: 50, // Faster flushing
  batchSize: 10      // Smaller batches
})

logger.info('Configuration updated - faster flushing enabled')

for (let i = 0; i < 5; i++) {
  const entry = structuredLogger.createLogEntry({
    level: 'info',
    message: `Runtime config test ${i}`,
    data: { testId: i }
  })
  
  await runtimeLogger.log(entry)
}

await runtimeLogger.flush()

logger.info('---')
logger.info('8. Cleanup and Resource Management')
logger.info('Destroying async loggers...')

await basicAsyncLogger.destroy()
await hftAsyncLogger.destroy()
await customAsyncLogger.destroy()
await fallbackLogger.destroy()
await batchLogger.destroy()
await runtimeLogger.destroy()
