/**
 * Trading-Specific Logging Examples
 * Demonstrates STOAT logger optimized for high-frequency trading scenarios
 */

import { stoat } from '../mod.ts'
import {
  createOrderId,
  createSymbol,
  createStrategyId,
  createAgentId,
  createPortfolioId
} from '../src/types/brands.ts'

const exampleLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'trading-examples'
})

exampleLogger.info('1. High-Frequency Trading Logger')

const hftLogger = stoat.create({
  level: 'error',
  prettyPrint: false,
  module: 'hft-engine'
})

exampleLogger.info('Processing high-frequency trades...', {
  testType: 'high-frequency-simulation',
  iterations: 10000
})
const startTime = performance.now()

for (let i = 0; i < 10000; i++) {
  if (i % 1000 === 0) {
    hftLogger.error('Market volatility spike detected', {
      tickId: i,
      volatility: Math.random() * 0.1,
      timestamp: Date.now()
    })
  }
}

const hftDuration = performance.now() - startTime
exampleLogger.info('HFT logging performance test completed', {
  testType: 'high-frequency-simulation',
  duration: Math.round(hftDuration * 100) / 100, // Round to 2 decimals
  durationUnit: 'ms',
  iterations: 10000,
  avgTimePerIteration: Math.round((hftDuration / 10000) * 100000) / 100000 // Round to 5 decimals
})

exampleLogger.info('---')
exampleLogger.info('2. Trading Audit Logger')

const auditLogger = stoat.create({
  level: 'info',
  outputDir: './audit-logs',
  prettyPrint: true,
  module: 'trading-audit',
  metadata: {
    compliance: 'SEC-FINRA',
    jurisdiction: 'US',
    version: '2.0.0'
  }
})

const tradeSequence = [
  {
    action: 'ORDER_RECEIVED',
    orderId: createOrderId('ORD-NVDA-20250117-001'),
    symbol: createSymbol('NVDA'),
    quantity: 100,
    price: 150.25
  },
  {
    action: 'ORDER_VALIDATED',
    checks: ['balance', 'risk_limits', 'market_hours']
  },
  {
    action: 'ORDER_ROUTED',
    venue: 'NYSE',
    routingTime: 0.5
  },
  {
    action: 'ORDER_EXECUTED',
    executionPrice: 150.23,
    slippage: 0.02,
    executionTime: 1.2
  }
]

const orderId = createOrderId('ORD-NVDA-20250117-001')
const symbol = createSymbol('NVDA')

for (const step of tradeSequence) {
  const tradeLogger = auditLogger.child({
    orderId,
    symbol,
    strategy: 'audit-trail'
  })

  tradeLogger.info(`Trade step: ${step.action}`, {
    ...step,
    timestamp: new Date().toISOString()
  })

  if (['ORDER_EXECUTED', 'ORDER_REJECTED'].includes(step.action)) {
    tradeLogger.write()
  }
}

exampleLogger.info('---')

exampleLogger.info('3. Multi-Strategy Trading System')

const strategies = [
  { id: createStrategyId('momentum-v2'), name: 'Momentum Strategy' },
  { id: createStrategyId('arbitrage-v1'), name: 'Arbitrage Strategy' },
  { id: createStrategyId('mean-reversion'), name: 'Mean Reversion Strategy' }
]

const mainLogger = stoat.create({
  level: 'info',
  outputDir: './strategy-logs',
  module: 'strategy-engine',
  metadata: {
    tradingSession: new Date().toISOString().split('T')[0],
    market: 'US_EQUITY'
  }
})

for (const strategy of strategies) {
  const strategyLogger = mainLogger.child({
    strategy: strategy.id,
    agentId: createAgentId(`agent-${strategy.name.toLowerCase().replace(/\s+/g, '-')}`)
  })

  strategyLogger.info(`Strategy initialized: ${strategy.name}`)
  
  const symbols = ['NVDA', 'GOOGL', 'MSFT']
  for (const symbolStr of symbols) {
    const sym = createSymbol(symbolStr)
    const orderLogger = strategyLogger.child({
      orderId: createOrderId(`${strategy.id}-${symbolStr}-${Date.now()}`),
      symbol: sym
    })

    const timer = orderLogger.timer('order-analysis')
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
    
    const metrics = timer.stop()
    
    orderLogger.info('Order analysis completed', {
      analysisTime: metrics.duration,
      memoryDelta: metrics.memoryDelta,
      recommendation: Math.random() > 0.5 ? 'BUY' : 'HOLD'
    })
  }

  strategyLogger.info(`Strategy session completed: ${strategy.name}`)
}

exampleLogger.info('---')
exampleLogger.info('4. Risk Management Logging')

const riskLogger = stoat.create({
  level: 'warn',
  outputDir: './risk-logs',
  prettyPrint: true,
  module: 'risk-management',
  metadata: {
    riskFramework: 'VaR-95',
    monitoringLevel: 'real-time'
  }
})

const riskEvents = [
  {
    type: 'POSITION_LIMIT_WARNING',
    severity: 'warn',
    portfolioId: createPortfolioId('portfolio-hedge-fund-a'),
    utilization: 85.6,
    limit: 90.0
  },
  {
    type: 'CONCENTRATION_RISK',
    severity: 'warn',
    symbol: createSymbol('TSLA'),
    concentration: 12.5,
    maxAllowed: 10.0
  },
  {
    type: 'VAR_BREACH',
    severity: 'error',
    currentVaR: 2.8,
    limit: 2.5,
    breach: 0.3
  }
]

for (const event of riskEvents) {
  const eventLogger = riskLogger.child({
    portfolioId: event.portfolioId,
    symbol: event.symbol,
    agentId: createAgentId('risk-monitor-001')
  })

  if (event.severity === 'warn') {
    eventLogger.warn(`Risk warning: ${event.type}`, {
      ...event,
      timestamp: new Date().toISOString(),
      requiresAction: event.type === 'VAR_BREACH'
    })
  } else {
    eventLogger.error(`Risk violation: ${event.type}`, {
      ...event,
      timestamp: new Date().toISOString(),
      requiresImmediateAction: true
    })
    eventLogger.write()
  }
}

exampleLogger.info('---')
exampleLogger.info('5. Performance Comparison')

const consoleLogger = stoat.create({
  level: 'info',
  module: 'perf-test-console'
})

const fileLogger = stoat.create({
  level: 'info',
  outputDir: './perf-logs',
  module: 'perf-test-file'
})

const testMessages = 1000

exampleLogger.info('Testing console-only performance...', {
  testType: 'console-performance',
  messageCount: testMessages
})
const consoleStart = performance.now()
for (let i = 0; i < testMessages; i++) {
  consoleLogger.info(`Console message ${i}`, { messageId: i })
}
const consoleEnd = performance.now()

exampleLogger.info('Testing file logging performance...', {
  testType: 'file-performance',
  messageCount: testMessages
})
const fileStart = performance.now()
for (let i = 0; i < testMessages; i++) {
  fileLogger.info(`File message ${i}`, { messageId: i })
}
const fileEnd = performance.now()

exampleLogger.info('Performance Results', {
  testType: 'performance-comparison',
  consolePerformance: {
    duration: Math.round((consoleEnd - consoleStart) * 100) / 100,
    durationUnit: 'ms',
    messageCount: testMessages,
    avgTimePerMessage: Math.round(((consoleEnd - consoleStart) / testMessages) * 100000) / 100000
  },
  filePerformance: {
    duration: Math.round((fileEnd - fileStart) * 100) / 100,
    durationUnit: 'ms',
    messageCount: testMessages,
    avgTimePerMessage: Math.round(((fileEnd - fileStart) / testMessages) * 100000) / 100000
  },
  performanceRatio: Math.round(((fileEnd - fileStart) / (consoleEnd - consoleStart)) * 100) / 100
})

exampleLogger.info('---')
exampleLogger.info('6. Market Data Processing')

const marketDataLogger = stoat.create({
  level: 'debug',
  prettyPrint: true,
  module: 'market-data-processor'
})

const marketData = {
  symbols: ['NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
  dataPoints: 100
}

exampleLogger.info('Processing market data', {
  testType: 'market-data-processing',
  dataPoints: marketData.dataPoints,
  symbolCount: marketData.symbols.length,
  symbols: marketData.symbols
})
const mdpStart = performance.now()

for (const symbolStr of marketData.symbols) {
  const symbol = createSymbol(symbolStr)
  const symbolLogger = marketDataLogger.child({
    symbol,
    agentId: createAgentId('market-data-001')
  })

  const timer = symbolLogger.timer('symbol-processing')

  for (let i = 0; i < marketData.dataPoints; i++) {
    if (i % 20 === 0) { // Log every 20th data point
      symbolLogger.debug(`Processing tick ${i} for ${symbolStr}`, {
        tickId: i,
        price: 100 + Math.random() * 50,
        volume: Math.floor(Math.random() * 10000),
        timestamp: Date.now()
      })
    }
  }

  const metrics = timer.stop()
  symbolLogger.info(`Symbol processing completed: ${symbolStr}`, {
    totalTicks: marketData.dataPoints,
    processingTime: metrics.duration,
    avgTickTime: metrics.duration / marketData.dataPoints
  })
}

const mdpEnd = performance.now()
exampleLogger.info('Market data processing completed', {
  testType: 'market-data-processing',
  duration: Math.round((mdpEnd - mdpStart) * 100) / 100,
  durationUnit: 'ms',
  dataPoints: marketData.dataPoints,
  symbolCount: marketData.symbols.length,
  avgTimePerSymbol: Math.round(((mdpEnd - mdpStart) / marketData.symbols.length) * 100) / 100
})

exampleLogger.info('---')
exampleLogger.info('All done!')