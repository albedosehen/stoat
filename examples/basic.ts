/**
 * Basic stoat Logger Usage Examples
 * Demonstrates simple logging with backward compatibility
 */

import { stoat } from '../mod.ts'

// Create a main logger for the examples themselves
const exampleLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'basic-examples'
})

exampleLogger.info('Basic stoat Logger Examples')

// 1. Simple logger creation
exampleLogger.info('1. Simple Logger')
const simpleLogger = stoat.create({
  level: 'info',
  prettyPrint: true
})

simpleLogger.info('Application started')
simpleLogger.warn('This is a warning', { code: 'WARN_001' })
simpleLogger.error('Something went wrong', {
  error: 'Connection timeout',
  duration: 5000
})

exampleLogger.info('---')

// 2. Console-only vs File logging
exampleLogger.info('2. Console-Only vs File Logging')

const consoleLogger = stoat.create({
  level: 'debug',
  module: 'console-demo',
  prettyPrint: true
})

consoleLogger.debug('Debug message - console only')
consoleLogger.info('Info message - console only')

// With file output (opt-in)
const fileLogger = stoat.create({
  level: 'info',
  outputDir: './logs',
  module: 'file-demo',
  metadata: { version: '1.0.0' }
})

fileLogger.info('This goes to both console and file')
fileLogger.error('Error logged to file', { error: 'database_error' })

exampleLogger.info('---')

// 3. Child loggers with inheritance
exampleLogger.info('3. Child Loggers with Inheritance')

const parentLogger = stoat.create({
  level: 'info',
  module: 'parent-service',
  metadata: { 
    service: 'user-service',
    version: '2.0.0' 
  },
  prettyPrint: true
})

// Child inherits parent configuration
const childLogger = parentLogger.child({
  agentId: 'auth-handler',
  requestId: 'user-12345'
})

const grandchildLogger = childLogger.child({
  strategy: 'login-flow',
  requestId: 'req-abc-123'
})

parentLogger.info('Parent logger message')
childLogger.info('Child logger message')
grandchildLogger.info('Grandchild logger message')

exampleLogger.info('---')

// 4. Performance timing
exampleLogger.info('4. Performance Timing')

const perfLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'performance-demo'
})

const timer = perfLogger.timer('database-query')

// Simulate some work
await new Promise(resolve => setTimeout(resolve, 100))

const metrics = timer.stop()
perfLogger.info('Database query completed', {
  query: 'SELECT * FROM users',
  duration: metrics?.duration,
  memoryDelta: metrics?.memoryDelta
})

exampleLogger.info('---')

// 5. Error handling and graceful fallbacks
exampleLogger.info('5. Error Handling (Never Throws)')

const errorLogger = stoat.create({
  level: 'info',
  prettyPrint: true
})

// STOAT never throws errors - graceful fallbacks
try {
  errorLogger.info('Normal message')
  
  // Even with invalid data, logger won't crash
  const circularObj: any = { name: 'test' }
  circularObj.self = circularObj
  
  errorLogger.info('Message with circular reference', circularObj)
  
  // Extremely large object
  const largeObj = {
    data: 'x'.repeat(1000000),
    nested: Array(1000).fill({ large: 'data' })
  }
  
  errorLogger.info('Large object logged safely', largeObj)
  
  exampleLogger.info('All logging operations completed safely!')
  
} catch (error) {
  exampleLogger.error('This should never happen - stoat never throws!')
}

exampleLogger.info('Example completed.')