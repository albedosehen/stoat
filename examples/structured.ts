/**
 * Structured Logging Examples
 * Demonstrates advanced structured logging features with OpenTelemetry compatibility
 */

import { stoat } from '../mod.ts'
import {
  createStructuredLogger,
  createStructuredEntry,
  serializeLogEntry
} from '../src/logging/structured.ts'
import {
  createTraceId,
  createSpanId,
  createRequestId,
  createOrderId,
  createSymbol,
  createStrategyId,
  createTimestamp,
  createSessionId,
  createAgentId,
  createPortfolioId
} from '../src/types/brands.ts'

const logger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'structured-examples'
})

logger.info('1. Basic Structured Logging')
const structuredLogger = createStructuredLogger({
  pretty: true,
  maxDepth: 10,
  includeStackTrace: true,
  timestampFormat: 'iso'
})

const basicEntry = structuredLogger.createLogEntry({
  level: 'info',
  message: 'User authentication successful',
  data: {
    userId: '12345',
    email: 'user@example.com',
    loginMethod: 'oauth'
  }
})

logger.info('Basic structured entry:', {
  serialized: structuredLogger.serialize(basicEntry)
})

logger.info('---')
logger.info('2. OpenTelemetry-Compatible Logging')

const traceId = createTraceId('4bf92f3577b34da6a3ce929d0e0e4736')
const spanId = createSpanId('00f067aa0ba902b7')
const requestId = createRequestId('req-12345-abcde')

const telemetryEntry = structuredLogger.createLogEntry({
  level: 'info',
  message: 'Processing user request',
  data: {
    endpoint: '/api/users',
    method: 'GET',
    statusCode: 200,
    responseTime: 45.2
  },
  context: {
    timestamp: createTimestamp(new Date().toISOString()),
    sessionId: createSessionId('sess-abc-123'),
    traceId,
    spanId,
    requestId,
    version: '2.0.0',
    environment: 'production',
    component: 'http-handler'
  }
})

logger.info('OpenTelemetry-compatible entry:', {
  serialized: structuredLogger.serialize(telemetryEntry)
})

logger.info('---')
logger.info('3. Trading-Specific Structured Logging')

const orderId = createOrderId('ORD-AAPL-20250117-001')
const symbol = createSymbol('AAPL')
const strategyId = createStrategyId('momentum-v2')

const tradingEntry = structuredLogger.createLogEntry({
  level: 'info',
  message: 'Order executed successfully',
  data: {
    orderId,
    symbol,
    side: 'BUY',
    quantity: 100,
    price: 150.25,
    venue: 'NYSE',
    executionTime: 0.023, // milliseconds
    slippage: 0.01
  },
  context: {
    timestamp: createTimestamp(new Date().toISOString()),
    sessionId: createSessionId('trading-sess-456'),
    traceId: createTraceId('trading-trace-789'),
    spanId: createSpanId('execution-span-123'),
    strategy: strategyId,
    agentId: createAgentId('agent-momentum-001'),
    portfolioId: createPortfolioId('portfolio-hedge-fund-a'),
    component: 'order-execution-engine',
    tags: ['trading', 'execution', 'equity'],
    metadata: {
      marketCondition: 'normal',
      volatility: 0.23,
      liquidity: 'high'
    }
  }
})

logger.info('Trading-specific entry:', {
  serialized: structuredLogger.serialize(tradingEntry)
})

logger.info('---')
logger.info('4. Error Logging with Stack Traces')

try {
  throw new Error('Database connection timeout')
} catch (error) {
  const errorEntry = structuredLogger.createLogEntry({
    level: 'error',
    message: 'Database operation failed',
    error: error as Error,
    data: {
      operation: 'getUserProfile',
      userId: '12345',
      timeout: 5000,
      retryAttempt: 3
    },
    context: {
      timestamp: createTimestamp(new Date().toISOString()),
      sessionId: createSessionId('sess-error-demo'),
      traceId: createTraceId('error-trace-123'),
      component: 'database-client',
      function: 'executeQuery'
    }
  })

  logger.error('Error entry with stack trace:', {
    serialized: structuredLogger.serialize(errorEntry)
  })
}

logger.info('---')
logger.info('5. Performant Minimal Logging')

const minimalLogger = createStructuredLogger({
  pretty: false,
  maxDepth: 3,
  includeStackTrace: false
})

const minimalEntry = minimalLogger.createMinimalEntry(
  'info',
  'tick processed',
  createTraceId('hft-tick-' + Date.now())
)

logger.info('Minimal high-performance entry:', {
  minimalEntry: minimalEntry
})

logger.info('---')
logger.info('6. Custom Serialization Options')

const customLogger = createStructuredLogger({
  pretty: true,
  maxDepth: 15,
  maxStringLength: 1000,
  maxArrayLength: 50,
  excludeFields: ['sensitiveData'],
  customFields: {
    application: 'trading-system',
    build: 'v2.0.0-beta.1',
    region: 'us-east-1'
  },
  timestampFormat: 'unix',
  levelFormat: 'both'
})

const customEntry = customLogger.createLogEntry({
  level: 'warn',
  message: 'High memory usage detected',
  data: {
    memoryUsage: 85.6, // percentage
    threshold: 80.0,
    process: 'market-data-processor',
    largeArray: Array(100).fill('data'), // Will be truncated
    sensitiveData: 'secret-api-key' // Will be excluded
  }
})

logger.warn('Custom serialized entry:', {
  serialized: customLogger.serialize(customEntry)
})

logger.info('---')
logger.info('7. Field Mapping for Legacy Systems')

const mappedEntry = structuredLogger.transformFields(basicEntry, {
  timestamp: '@timestamp',
  level: 'severity',
  message: 'msg',
  traceId: 'trace.id',
  spanId: 'span.id',
  data: 'payload'
})

logger.info('Mapped fields for legacy system:', {
  mappedEntry: mappedEntry
})

logger.info('---')
logger.info('8. Performance Tracking')

const performanceLogger = createStructuredLogger({
  pretty: true
})

for (let i = 0; i < 10; i++) {
  const entry = performanceLogger.createLogEntry({
    level: 'debug',
    message: `Performance test ${i}`,
    data: { iteration: i, timestamp: Date.now() }
  })
  performanceLogger.serialize(entry)
}

logger.info('Performance statistics:', {
  stats: performanceLogger.getPerformanceStats()
})

logger.info('---')
logger.info('9. Utility Functions')

const quickEntry = createStructuredEntry(
  'info',
  'Quick structured entry',
  { quickData: true },
  {
    timestamp: createTimestamp(new Date().toISOString()),
    sessionId: createSessionId('quick-session'),
    component: 'utility-demo'
  }
)

logger.info('Quick entry:', {
  serialized: serializeLogEntry(quickEntry, { pretty: true })
})
