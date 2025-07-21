# Stoat Logger Configuration Guide

This guide covers all configuration options for Stoat logger including environment-specific presets, security settings, and performance tuning for different use cases.

## Table of Contents

- [Quick Start Configurations](#quick-start-configurations)
- [Transport Configuration](#transport-configuration)
- [Serializer Configuration](#serializer-configuration)
- [Environment Presets](#environment-presets)
- [Trading-Specific Configuration](#trading-specific-configuration)
- [Performance Tuning](#performance-tuning)

## Quick Start Configurations

### Development

```typescript
import { stoat } from 'jsr:@albedosehen/stoat'

const logger = stoat.create({
  level: 'debug',
  structured: true,
  prettyPrint: true,
  transports: [{
    type: 'console',
    format: 'json'
  }],
  serializer: {
    maxDepth: 20,
    includeStackTrace: true
  }
})
```

### Adding Additional Settings

```typescript
const logger = stoat.create({
  level: 'info',
  structured: true,
  transports: [
    {
      type: 'console',
      format: 'text',
      minLevel: 'warn'
    },
    {
      type: 'file',
      path: './logs/app.log',
      format: 'json',
      async: true,
      bufferSize: 5000
    }
  ],
  security: {
    enableSanitization: true,
    redactFields: ['password', 'apiKey', 'token']
  },
  async: {
    enabled: true,
    config: ASYNC_CONFIGS.web
  }
})
```

### Async Logging

```typescript
const customAsyncConfig: AsyncConfig = {
  bufferSize: 2000,
  maxBufferSize: 10000,
  flushInterval: 500,
  batchSize: 100,
  syncOnExit: true,
  enableBackpressure: true,
  maxRetries: 2,
  retryDelay: 50,
  priorityLevels: {
    trace: 5,
    debug: 10,
    info: 20,
    warn: 30,
    error: 50,
    fatal: 100
  },
  syncFallback: true,
  syncThreshold: 75 * 1024 * 1024 // 75MB
}

const asyncLogger = createAsyncLogger(customAsyncConfig, (entry) => {
  // Custom sync callback
  console.log(JSON.stringify(entry))
})
```

## Transport Configuration

Available transports include `console`, `file`, `http`, `websocket`, `memory`, and `custom`. Each transport has its own configuration options.

### Console Transport

```typescript
// Example
{
  type: 'console',
  format: 'json',
  minLevel: 'debug',
  prettyPrint: true,
  colors: true
}
```

### File Transport

```typescript
// Example
{
  type: 'file',
  path: './logs/app.log',
  format: 'json',
  minLevel: 'info',
  maxSize: 100 * 1024 * 1024,   // 100MB
  maxFiles: 10,
  compress: true,
  async: true,
  bufferSize: 1000
}
```

### HTTP Transport

```typescript
// Example
{
  type: 'http',
  endpoint: 'https://logs.company.com/ingest',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  minLevel: 'warn',
  batchSize: 50,
  timeout: 5000,
  retries: 3
}
```

### Multiple Transports

```typescript
const logger = stoat.create({
  level: 'debug',
  structured: true,
  transports: [
    {
      type: 'console',
      format: 'json',
      minLevel: 'debug',
      prettyPrint: true
    },
    {
      type: 'file',
      path: './logs/app.log',
      format: 'text',
      minLevel: 'info',
      async: true
    },
    {
      type: 'http',
      endpoint: 'https://logs.company.com',
      minLevel: 'warn',
      batchSize: 100
    }
  ]
})
```

## Security Settings

### Data Sanitization

```typescript
import { createSanitizer } from '@albedosehen/stoat/security'

const securityConfig: SecurityConfig = {
  enableSanitization: true,
  redactFields: [
    // Authentication
    'password', 'passwd', 'pwd',
    'apiKey', 'api_key', 'token', 'jwt',
    'secret', 'key', 'auth',
    
    // Personal information
    'ssn', 'social_security_number',
    'email', 'phone', 'address',
    'creditCard', 'credit_card_number',
    
    // Financial
    'accountNumber', 'routingNumber',
    'bankAccount', 'iban'
  ],
  redactRegexes: [
    // Credit card numbers
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Phone numbers
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    
    // Social Security Numbers
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g
  ],
  maxLogSize: 1024 * 1024, // 1MB
  enableTruncation: true,
  classifyData: true
}

const logger = stoat.create({
  security: securityConfig
})

// Automatically redacts sensitive data
logger.info('User login', {
  userId: 123,
  email: 'user@example.com',    // [REDACTED]
  password: 'secret123',        // [REDACTED]
  creditCard: '4111-1111-1111-1111' // [REDACTED]
})
```

### Data Classification

```typescript
import { markSensitive, createSanitized } from '@albedosehen/stoat/types'

// Compile-time security classification
const customerData = markSensitive({
  ssn: '123-45-6789',
  creditScore: 750,
  income: 75000
})

const sanitizedInput = createSanitized(userInput)

logger.info('Customer updated', {
  customerId: 123,
  data: customerData,      // Automatically handled as sensitive
  source: sanitizedInput   // Marked as safe
})
```

## Serializer Configuration

### Custom Serializers

```typescript
import { createSerializer } from '@albedosehen/stoat/serializers'

const serializer = createSerializer({
  maxDepth: 10,
  maxStringLength: 5000,
  enableCircularDetection: true,
  fastPaths: true,
  customSerializers: {
    // Trading-specific types
    'BigNumber': (value: any) => ({
      __type: 'bignumber',
      value: value.toString(),
      precision: value.decimalPlaces?.() || 0
    }),
    
    'Decimal': (value: any) => ({
      __type: 'decimal',
      value: value.toString()
    }),
    
    // Custom business objects
    'Order': (value: any) => ({
      __type: 'order',
      id: value.id,
      symbol: value.symbol,
      quantity: value.quantity,
      price: value.price,
      // Exclude sensitive fields
      timestamp: value.timestamp
    }),
    
    // Date handling
    'Date': (value: Date) => ({
      __type: 'date',
      iso: value.toISOString(),
      unix: value.getTime()
    })
  }
})

// Use custom serializer
const result = serializer.serialize(complexObject)
console.log(`Serialized in ${result.serializationTime}ms`)
```

## Environment Presets

### Development Environment

```typescript
export const DEVELOPMENT_CONFIG: StoatConfig = {
  level: 'debug',
  structured: true,
  prettyPrint: true,
  transports: [{
    type: 'console',
    format: 'json',
    prettyPrint: true,
    colors: true
  }],
  serializer: {
    maxDepth: 20,
    includeStackTrace: true,
    includeNonEnumerable: true,
    enablePerformanceTracking: true
  },
  async: {
    enabled: false // Immediate logging for debugging
  },
  context: {
    environment: 'development',
    service: process.env.SERVICE_NAME
  }
}
```

### Testing Environment

```typescript
export const TESTING_CONFIG: StoatConfig = {
  level: 'info',
  structured: true,
  transports: [
    {
      type: 'console',
      format: 'text',
      minLevel: 'warn'
    },
    {
      type: 'file',
      path: './test-logs/test.log',
      format: 'json',
      minLevel: 'debug'
    }
  ],
  serializer: {
    maxDepth: 15,
    includeStackTrace: true
  },
  context: {
    environment: 'testing',
    service: process.env.SERVICE_NAME
  }
}
```

### Production Environment

```typescript
export const PRODUCTION_CONFIG: StoatConfig = {
  level: 'info',
  structured: true,
  transports: [
    {
      type: 'console',
      format: 'text',
      minLevel: 'warn'
    },
    {
      type: 'file',
      path: './logs/app.log',
      format: 'json',
      async: true,
      bufferSize: 5000,
      maxSize: 100 * 1024 * 1024,
      maxFiles: 10,
      compress: true
    },
    {
      type: 'http',
      endpoint: process.env.LOG_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${process.env.LOG_TOKEN}`
      },
      minLevel: 'error',
      batchSize: 100
    }
  ],
  async: {
    enabled: true,
    config: ASYNC_CONFIGS.web,
    syncFallback: true
  },
  security: {
    enableSanitization: true,
    redactFields: [
      'password', 'apiKey', 'token', 'jwt',
      'creditCard', 'ssn', 'email'
    ],
    maxLogSize: 1024 * 1024
  },
  context: {
    environment: 'production',
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION
  }
}
```

## Trading-Specific Configuration

### High-Frequency Trading

```typescript
export const HFT_CONFIG: StoatConfig = {
  level: 'error', // Only critical errors
  structured: true,
  async: {
    enabled: true,
    config: {
      ...ASYNC_CONFIGS.trading,
      bufferSize: 5000,          // Larger buffer
      flushInterval: 50,         // Very fast flush
      syncThreshold: 25 * 1024 * 1024, // 25MB threshold
      maxRetries: 0              // No retries for max performance
    },
    syncFallback: true
  },
  serializer: {
    fastPaths: true,             // Zero-allocation paths
    maxDepth: 3,                 // Shallow serialization
    enableCircularDetection: false, // Disabled for performance
    maxStringLength: 1000,       // Shorter strings
    maxArrayLength: 100          // Smaller arrays
  },
  transports: [{
    type: 'console',
    format: 'text'               // Fastest format
  }],
  context: {
    environment: 'production',
    component: 'hft-engine'
  }
}
```

### Market Data Processing

```typescript
export const MARKET_DATA_CONFIG: StoatConfig = {
  level: 'warn',
  structured: true,
  async: {
    enabled: true,
    config: ASYNC_CONFIGS.trading
  },
  serializer: {
    fastPaths: true,
    customSerializers: {
      'MarketTick': (tick: any) => ({
        symbol: tick.symbol,
        price: tick.price,
        volume: tick.volume,
        timestamp: tick.timestamp
      }),
      'OrderBook': (book: any) => ({
        symbol: book.symbol,
        bidCount: book.bids.length,
        askCount: book.asks.length,
        spread: book.spread
      })
    }
  },
  context: {
    component: 'market-data-processor'
  }
}
```

### Audit & Compliance

```typescript
export const AUDIT_CONFIG: StoatConfig = {
  level: 'info',
  structured: true,
  transports: [
    {
      type: 'file',
      path: './audit-logs/audit.log',
      format: 'json',
      async: true,
      maxSize: 500 * 1024 * 1024, // 500MB
      maxFiles: 50,               // Keep more files
      compress: true
    },
    {
      type: 'http',
      endpoint: process.env.AUDIT_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${process.env.AUDIT_TOKEN}`,
        'X-Audit-Source': 'trading-system'
      },
      minLevel: 'info',
      batchSize: 1                // Immediate sending for audit
    }
  ],
  security: {
    enableSanitization: false,    // Keep full data for audit
    classifyData: true,
    auditLevel: 'info'
  },
  serializer: {
    maxDepth: 20,                // Full object depth
    includeStackTrace: true,
    includeNonEnumerable: true
  },
  context: {
    component: 'audit-logger',
    compliance: 'SEC-FINRA'
  }
}
```

## Performance Tuning

### Memory Management

```typescript
const lowMemoryConfig: StoatConfig = {
  level: 'warn',
  async: {
    enabled: true,
    config: {
      ...ASYNC_CONFIGS.web,
      bufferSize: 100,                  // Small buffer
      maxBufferSize: 500,               // Small max buffer
      syncThreshold: 10 * 1024 * 1024,  // 10MB threshold
      enableBackpressure: true          // Handle memory pressure
    }
  },
  serializer: {
    maxDepth: 5,                 // Shallow serialization
    maxStringLength: 1000,       // Short strings
    maxArrayLength: 50,          // Small arrays
    maxObjectKeys: 20            // Few object keys
  }
}
```

### High-Throughput Configuration

```typescript
const highThroughputConfig: StoatConfig = {
  level: 'error',
  structured: true,
  async: {
    enabled: true,
    config: {
      bufferSize: 10000,          // Large buffer
      maxBufferSize: 50000,       // Very large max buffer
      flushInterval: 100,         // Fast flush
      batchSize: 1000,            // Large batches
      enableBackpressure: false,  // No backpressure for max speed
      maxRetries: 0               // No retries
    }
  },
  serializer: {
    fastPaths: true,                // Zero-allocation
    enableCircularDetection: false, // Disabled for speed
    maxDepth: 3                     // Shallow only
  }
}
```

### Monitoring Configuration

```typescript
// Full monitoring and observability
const monitoringConfig: StoatConfig = {
  level: 'debug',
  structured: true,
  enablePerformanceTracking: true,
  transports: [
    {
      type: 'console',
      format: 'json'
    },
    {
      type: 'http',
      endpoint: 'https://metrics.company.com/logs',
      minLevel: 'info'
    }
  ],
  serializer: {
    enablePerformanceTracking: true,
    includeStackTrace: true
  },
  context: {
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    region: process.env.AWS_REGION,
    instance: process.env.INSTANCE_ID
  }
}
```

## Configuration Validation

```typescript
import { validateConfig } from '@albedosehen/stoat/config'

// Validate configuration before use
const config: StoatConfig = {
  level: 'info',
  structured: true,
  // ... other settings
}

try {
  const validatedConfig = validateConfig(config)
  const logger = stoat.create(validatedConfig)
} catch (error) {
  console.error('Invalid configuration:', error.message)
}
```

## Environment Variables

Stoat Logger supports configuration via environment variables:

```bash
# Core settings
STOAT_LOG_LEVEL=info
STOAT_STRUCTURED=true
STOAT_PRETTY_PRINT=true

# Async settings  
STOAT_ASYNC_ENABLED=true
STOAT_ASYNC_BUFFER_SIZE=1000
STOAT_ASYNC_FLUSH_INTERVAL=1000

# Security settings
STOAT_SANITIZATION_ENABLED=true
STOAT_MAX_LOG_SIZE=1048576

# Transport settings
STOAT_CONSOLE_FORMAT=json
STOAT_FILE_PATH=./logs/app.log
STOAT_HTTP_ENDPOINT=https://logs.company.com

# Context settings
STOAT_SERVICE_NAME=my-service
STOAT_SERVICE_VERSION=1.0.0
STOAT_ENVIRONMENT=production
```

```typescript
// Load configuration from environment
import { loadConfigFromEnv } from 'jsr:@albedosehen/stoat'

const config = loadConfigFromEnv()
const logger = stoat.create(config)
