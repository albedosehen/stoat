/**
 * Basic Stoat Logger Example
 * Demonstrates basic logging functionality through unified stoat.create() interface
 */

import { stoat, createRequestId } from '../mod.ts'

const moduleLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'basic-examples'
})

moduleLogger.info("I'm the main logger for this example!")
moduleLogger.info('Log some data:', { foo: 'bar' })
moduleLogger.debug('AND LOG A DEBUG MESSAGE! THIS MESSAGE WILL NOT APPEAR!')
moduleLogger.info('---')

const simpleLogger = moduleLogger.child({
  prettyPrint: false
})

simpleLogger.warn("I'm a child logger with no pretty print!", { code: 'BASED_001' })

simpleLogger.error('Something went wrong', {
  error: 'Connection timeout',
  duration: 5000
})

moduleLogger.info('---')
moduleLogger.info('Console-Only Logging (Default Transport)')

const debugLogger = stoat.create({
  level: 'debug',
  metadata: {
    context: 'console-only-example',
  }
})

debugLogger.debug('Debug message (console only)')
debugLogger.info('Info message (console only)')

moduleLogger.info('---')
moduleLogger.info('File Logging')

const fileLogger = stoat.create({
  level: 'info',
  outputDir: './example-logs',
  module: 'basic-stoat-examples_fileLogger',
  metadata: { version: '1.0.0' }
})

fileLogger.info('This goes to both console and file')
fileLogger.error('Error logged to file', { error: 'database_error' })

moduleLogger.info('---')
moduleLogger.info('Child Loggers with Inheritance')

const parentLogger = stoat.create({
  level: 'info',
  module: 'parent-service',
  metadata: { 
    service: 'user-service',
    version: '2.0.0' 
  },
  prettyPrint: true
})

const childLogger = parentLogger.child({
  agentId: 'auth-handler',
  requestId: createRequestId('user-12345')
})

const grandchildLogger = childLogger.child({
  strategy: 'login-flow',
  requestId: createRequestId('req-abc-123')
})

parentLogger.info('Parent logger message')
childLogger.info('Child logger message')
grandchildLogger.info('Grandchild logger message')

moduleLogger.info('---')
moduleLogger.info('Performance Measurement with built-in timer')

const perfLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'performance-demo'
})

const timer = perfLogger.timer('database-query')

// Pretend to do some async work
await new Promise(resolve => setTimeout(resolve, 100))

const metrics = timer.stop()
perfLogger.info('Database query completed', {
  query: 'getUsers',
  duration: metrics?.duration,
  memoryDelta: metrics?.memoryDelta
})

moduleLogger.info('---')
moduleLogger.info('Error Handling (Graceful Fallbacks)')

const errorLogger = stoat.create({
  level: 'info',
  prettyPrint: true
})

try {
  errorLogger.info('Normal message')
  const circularObj: any = { name: 'test' }
  circularObj.self = circularObj
  
  errorLogger.info('Message with circular reference', circularObj)
  
} catch (error) {
  moduleLogger.error('No throw!')
}

moduleLogger.info('See other examples for advanced features.')

Deno.exit(0)