/**
 * Advanced Stoat Logger Example
 * Demonstrates advanced logging features through unified stoat.create() interface
 */

import { stoat, createRequestId } from '../mod.ts'

const mainLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'dev-examples'
})

const devLogger = stoat.create({
  level: 'trace',
  prettyPrint: true,
  module: 'development',
  metadata: {
    developer: 'John Doe',
    session: new Date().toISOString(),
    environment: 'local'
  }
})

devLogger.trace('Application startup trace')
devLogger.debug('Debug information', { 
  config: { apiUrl: 'http://localhost:3000' },
  features: ['auth', 'trading', 'analytics']
})
devLogger.info('Application initialized successfully')

mainLogger.info('---')
mainLogger.info('Component-Based Logging')

const appLogger = stoat.create({
  level: 'debug',
  prettyPrint: true,
  module: 'my-app',
  metadata: { version: '1.0.0-dev' }
})

const authLogger = appLogger.child({
  module: 'auth-component',
  requestId: createRequestId('req-auth-001')
})

const dbLogger = appLogger.child({
  module: 'database-component',
  requestId: createRequestId('req-db-001')
})

const apiLogger = appLogger.child({
  module: 'api-component',
  requestId: createRequestId('req-api-001')
})

authLogger.debug('Validating user credentials')
authLogger.info('User authenticated successfully', { userId: '12345' })

dbLogger.debug('Connecting to database')
dbLogger.info('Database connection established', { connectionTime: 45 })

apiLogger.debug('Processing API request')
apiLogger.info('API response sent', { statusCode: 200, responseTime: 12 })

mainLogger.info('---')
mainLogger.info('Error Debugging')

const errorLogger = stoat.create({
  level: 'debug',
  prettyPrint: true,
  module: 'error-debugging'
})

try {
  function processUserData(userData: any) {
    if (!userData) {
      throw new Error('User data is required')
    }
    
    if (!userData.email) {
      throw new Error('Email is required')
    }
    
    if (!userData.email.includes('@')) {
      throw new Error('Invalid email format')
    }
    
    return { success: true, userId: userData.id }
  }

  function handleUserRequest(request: any) {
    errorLogger.debug('Processing user request', { 
      requestId: request.id,
      timestamp: new Date().toISOString()
    })
    
    return processUserData(request.userData)
  }

  const invalidRequest = {
    id: 'req-123',
    userData: {
      id: '456',
      email: 'invalid-email'
    }
  }

  handleUserRequest(invalidRequest)

} catch (error) {
  errorLogger.error('Request processing failed', {
    error: (error as Error).message,
    stack: (error as Error).stack,
    context: {
      function: 'handleUserRequest',
      step: 'user_data_validation'
    },
    debugging: {
      timestamp: new Date().toISOString(),
      pid: Deno.pid,
      memory: Deno.memoryUsage()
    }
  })
}

mainLogger.info('---')
mainLogger.info('Performance Profiling')

const perfLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'performance-profiler'
})

async function profiledFunction(name: string, duration: number) {
  const timer = perfLogger.timer(name)
  
  perfLogger.debug(`Starting ${name}`)
  
  await new Promise(resolve => setTimeout(resolve, duration))
  
  const metrics = timer.stop()
  
  perfLogger.info(`Completed ${name}`, {
    duration: metrics.duration,
    memoryDelta: metrics.memoryDelta,
    operation: name
  })
  
  return metrics
}

await profiledFunction('database-query', 50)
await profiledFunction('api-call', 25)
await profiledFunction('data-processing', 75)

mainLogger.info('---')

mainLogger.info('Feature Flags & Conditional Logging')

const featureLogger = stoat.create({
  level: 'debug',
  prettyPrint: true,
  module: 'feature-system'
})

const features = {
  newAuthFlow: true,
  betaAnalytics: false,
  debugMode: true
}

if (features.debugMode) {
  featureLogger.debug('Debug mode enabled', { features })
}

if (features.newAuthFlow) {
  const authFlowLogger = featureLogger.child({
    agentId: 'new-auth-flow',
    strategy: 'feature-flag'
  })
  authFlowLogger.info('Using new authentication flow')
  authFlowLogger.debug('New auth flow configuration', {
    provider: 'oauth2',
    scopes: ['read', 'write'],
    redirectUrl: 'http://localhost:3000/callback'
  })
}

if (features.betaAnalytics) {
  featureLogger.info('Beta analytics enabled')
} else {
  featureLogger.debug('Beta analytics disabled - using standard analytics')
}

mainLogger.info('---')
mainLogger.info('Request Tracing')

const tracingLogger = stoat.create({
  level: 'debug',
  prettyPrint: true,
  module: 'request-tracer'
})

async function simulateRequest(requestId: string) {
  const requestLogger = tracingLogger.child({
    requestId: createRequestId(requestId),
    agentId: 'request-handler'
  })

  requestLogger.info('Request started', { requestId })

  const middlewareLogger = requestLogger.child({
    agentId: 'middleware',
    strategy: 'auth-check'
  })
  middlewareLogger.debug('Checking authentication')
  await new Promise(resolve => setTimeout(resolve, 10))
  middlewareLogger.debug('Authentication verified')

  const businessLogger = requestLogger.child({
    agentId: 'business-logic',
    strategy: 'data-processing'
  })
  businessLogger.debug('Processing business logic')
  await new Promise(resolve => setTimeout(resolve, 20))
  businessLogger.info('Business logic completed', { result: 'success' })

  requestLogger.info('Request completed', {
    requestId,
    statusCode: 200,
    totalTime: 30
  })
}

await Promise.all([
  simulateRequest('req-001'),
  simulateRequest('req-002'),
  simulateRequest('req-003')
])

mainLogger.info('---')
mainLogger.info('7. Testing & Debugging Helpers')

const testLogger = stoat.create({
  level: 'trace',
  prettyPrint: true,
  module: 'test-runner'
})

function createTestLogger(testName: string) {
  return testLogger.child({
    strategy: testName,
    agentId: 'test-case'
  })
}

const tests = ['user-auth-test', 'data-validation-test', 'api-integration-test']

for (const testName of tests) {
  const testCaseLogger = createTestLogger(testName)
  
  testCaseLogger.debug(`Starting test: ${testName}`)
  testCaseLogger.trace('Setting up test data')
  testCaseLogger.trace('Executing test logic')
  
  const passed = Math.random() > 0.3
  
  if (passed) {
    testCaseLogger.info(`Test passed: ${testName}`, { 
      result: 'PASS',
      duration: Math.floor(Math.random() * 100)
    })
  } else {
    testCaseLogger.error(`Test failed: ${testName}`, {
      result: 'FAIL',
      reason: 'Assertion failed',
      expected: 'truthy',
      actual: 'false'
    })
  }
}

mainLogger.info('---')
mainLogger.info('Resource Monitoring')

const monitorLogger = stoat.create({
  level: 'info',
  prettyPrint: true,
  module: 'resource-monitor'
})

function logResourceUsage(operation: string) {
  const memory = Deno.memoryUsage()
  
  monitorLogger.info(`Resource usage - ${operation}`, {
    memory: {
      rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`
    },
    operation
  })
}

logResourceUsage('startup')

const largeArray = new Array(100000).fill('test-data')
logResourceUsage('after-large-allocation')

largeArray.length = 0
logResourceUsage('after-cleanup')

Deno.exit(0)