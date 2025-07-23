# Stoat 🐹

[![Build Status](https://img.shields.io/badge/Build-passing-brightgreen.svg)](https://github.com/albedosehen/stoat) [![Deno Version](https://img.shields.io/badge/Deno-v2.4.1-green)](https://deno.land/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![JSR](https://jsr.io/badges/@albedosehen/stoat)](https://jsr.io/@albedosehen/stoat)

Stoat is a simple and modular logging framework with support for multiple transports.

---

I designed this logger for use in my own applications, but I believe it can be useful in many others as well.

## Where Stoat shines

Stoat is particularly well-suited for high-throughput, performance-critical Deno applications that require structured logging, observability, and sanitization features.

## Core Features

Originally developed as a structured logging framework, the stoat logger now supports a suite of common logging functionalities to support various logging needs.

- **Structured Logging**: JSON-first, OpenTelemetry compatible
- **Async Logging**: Zero-allocation paths for trading systems
- **Fast Async Buffers**: Sub-millisecond logging for low-footprint applications
- **File System Integration**: Efficient file-based logging with rotation and archival
- **Contextual Logging**: Support hierarchical logging, request correlation, trace/span IDs, and application context
- **Child Loggers**: Create child loggers with inherited context
- **Observability & Tracing**: OpenTelemetry integration, rich context propagation
- **Security Features**: Input sanitization, data classification, error-safe design
- **Custom Serializer Engine**: Circular reference detection, TypeScript 5.x branded types

---

## Additional Features

### Performance

Stoat offers memory-efficient logging with zero-allocation paths for simple log entries, making it ideal for low-footprint applications. It supports automatic backpressure management and intelligent buffering to handle memory pressure without blocking.

- **Backpressure Management**: Intelligent buffering and memory pressure detection
- **Dynamic Log Levels**: Custom log levels with advanced management
- **Modular Transport Systems**: Console, file, HTTP, WebSocket, and custom transports for integration
- **Safe Fallbacks**: Fallbacks for sync logging under memory pressure

## **Security & Reliability**

A strong emphasis on security, reliability, and best practices went into ensuring safe logging in production environments.

- **Input Sanitization** with configurable redaction policies
- **Data Classification** (sensitive data marking and handling)
- **Error-Safe Design** (never throws, graceful fallbacks)
- **Comprehensive Test Suite** (439+ successful test steps)
- **Production-Ready** with extensive error handling

## **Observability & Tracing**

It also easily integrates with OpenTelemetry for distributed tracing, making it suitable for microservices and complex architectures.

- **OpenTelemetry Integration** (trace/span correlation)
- **Rich Context Propagation** for microservices
- **Request Correlation** across distributed systems
- **Performance Timing** with built-in operation tracking
- **Memory Usage Monitoring** with automatic optimization

---

## Quick Start

### Basic Usage

```typescript
import { stoat } from '@albedosehen/stoat'

const logger = stoat.create({
  level: 'info',
  prettyPrint: true
})

logger.trace('This is a trace message')
logger.info('Application started')
logger.warn('High process count', { process: 'app.exe', usage: 73 })
logger.error('Order execution failed', { orderId: 'ORD-123', error: 'timeout' })
```

### Advanced Logging with `LogEntry`

```typescript
import {
  stoat,
  StructuredLogger,
  createAsyncLogger,
  ASYNC_CONFIGS
} from '@albedosehen/stoat'

const structuredLogger = new StructuredLogger({
  pretty: true,
  maxDepth: 15,
  includeStackTrace: true,
  timestampFormat: 'iso'
})

const logEntry = structuredLogger.createLogEntry({
  level: 'info',
  message: 'Trade executed successfully',
  data: {
    orderId: 'ORD-123',
    symbol: 'NVDA',
    quantity: 100,
    price: 150.25,
    venue: 'NYSE'
  },
  context: {
    traceId: 'trace-abc-123',
    spanId: 'span-def-456',
    requestId: 'req-789',
    strategy: 'momentum',
    agentId: 'agent-001'
  }
})

const jsonOutput = structuredLogger.serialize(logEntry)
console.log(jsonOutput)
```

---

## Feature Overview

### Async Logging

```typescript
// async loggers for trading systems
const asyncLogger = createAsyncLogger(
  ASYNC_CONFIGS.trading,
  (entry) => {
    console.log(JSON.stringify(entry))
  }
)

// Log thousands of entries without blocking
for (let i = 0; i < 10000; i++) {
  await asyncLogger.log({
    timestamp: new Date().toISOString(),
    level: 'info',
    levelValue: 30,
    message: `Low-footprint entry ${i}`,
    data: { tickId: i, latency: performance.now() }
  })
}

// Flush as required (or just allow auto-flush)
await asyncLogger.flush()
```

### Supports Multiple Transports

```typescript
const logger = stoat.create({
  transports: [
    createConsoleTransport({
      format: 'json',
      minLevel: 'debug'
    }),
    createFileTransport({
      path: './logs/app.log',
      format: 'text',
      minLevel: 'info',
      async: true,
      bufferSize: 1000
    }),
    createHttpTransport({
      endpoint: 'https://logs.company.com/ingest',
      minLevel: 'warn',
      batchSize: 100
    })
  ]
})
```

### Custom Serializers

```typescript
const serializer = createSerializer({
  maxDepth: 10,
  maxStringLength: 5000,
  enableCircularDetection: true,
  fastPaths: true,
  customSerializers: {
    'BigNumber': (value) => ({
      __type: 'bignumber',
      value: value.toString(),
      precision: value.decimalPlaces()
    }),
    'OrderId': (value) => ({
      __type: 'orderId',
      value: String(value)
    })
  }
})

const result = serializer.serialize(complexTradingObject)
console.log(`Serialized in ${result.serializationTime}ms`)
```

### TypeScript Branded Types

```typescript
import {
  createTraceId,
  createOrderId,
  createSymbol,
  markSensitive
} from '@albedosehen/stoat/types'

// Compile-time type safety with branded types
const traceId = createTraceId('trace-abc-123')
const orderId = createOrderId('ORD-456')
const symbol = createSymbol('NVDA')

// Security classification
const sensitiveData = markSensitive({
  apiKey: 'secret-key',
  customerPII: 'sensitive-info'
})

logger.info('Order processed', {
  traceId,      // Type: TraceId (not just string)
  orderId,      // Type: OrderId
  symbol,       // Type: Symbol
  sensitive: sensitiveData // Will be automatically redacted
})
```

---

## Complete Example

```typescript
import { stoat } from '@albedosehen/stoat'

// Rich development logger with pretty-printing
const devLogger = stoat.create({
  level: 'trace',
  prettyPrint: true,
  structured: true,
  transports: [{
    type: 'console',
    format: 'json'
  }],
  serializer: {
    maxDepth: 20,
    includeStackTrace: true,
    includeNonEnumerable: true
  }
})

// Debug complex objects with full detail
const complexObject = {
  user: { id: 123, profile: { /* deep nesting */ } },
  orders: [/* large arrays */],
  metadata: new Map(),
  customTypes: new BigNumber('123.456')
}

devLogger.debug('Complex object analysis', complexObject)

// Performance debugging
const perfLogger = devLogger.child({
  component: 'performance-analysis'
})

const start = performance.now()
// ... some operation
perfLogger.trace('Operation timing', {
  operation: 'data-processing',
  duration: performance.now() - start,
  memoryBefore: process.memoryUsage(),
  memoryAfter: process.memoryUsage()
})
```

For more, see the **examples/** directory.

---

## Security Features

### Data Sanitization & Redaction

```typescript
import { createSanitizer } from '@albedosehen/stoat/security'

const logger = stoat.create({
  security: {
    enableSanitization: true,
    sanitizer: createSanitizer({
      redactFields: ['password', 'apiKey', 'ssn', 'creditCard'],
      redactRegexes: [
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit cards
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Emails
      ],
      maxLogSize: 1024 * 1024, // 1MB limit
      enableTruncation: true
    })
  }
})

// Automatically redacts sensitive data
logger.info('User login', {
  userId: 123,
  email: 'user@example.com', // Will be redacted
  password: 'secret123',     // Will be redacted
  apiKey: 'key-abc-123'      // Will be redacted
})

// Output: { userId: 123, email: '[REDACTED]', password: '[REDACTED]', apiKey: '[REDACTED]' }
```

### Type-Safe Security Classification

```typescript
import { markSensitive, createSanitized } from '@albedosehen/stoat/types'

// Compile-time security classification
const customerData = markSensitive({
  ssn: '123-45-6789',
  creditScore: 750,
  income: 75000
})

const sanitizedInput = createSanitized(userInput) // Validated input

logger.info('Customer profile updated', {
  customerId: 123,
  data: customerData,    // Automatically handled as sensitive
  source: sanitizedInput // Marked as safe
})
```

## 📊 Performance Benchmarks

### Async Logging Performance

```text
Low-Footprint Scenario (100,000 entries):
├── Sync Logging:    ~2,847ms
├── Async Logging:   ~156ms    (18x faster)
├── Fast Path:       ~23ms     (124x faster)
└── Memory Usage:    <50MB

Data Processing (1M entries/sec):
├── Latency P50:     0.02ms
├── Latency P95:     0.08ms
├── Latency P99:     0.15ms
├── Memory Pressure: Auto-sync fallback at 50MB
└── Zero-Allocation: Fast path for simple entries
```

### Serialization Performance

```text
Complex Object Serialization:
├── Standard JSON.stringify:     ~45ms
├── STOAT Custom Serializer:     ~12ms    (3.7x faster)
├── STOAT Fast Path:             ~2ms     (22x faster)
├── Circular Reference Handling: ✅ Safe
└── Trading Type Support:        ✅ Optimized
```

## 🧪 Testing & Reliability

Comprehensive tests covering all aspects of the library:

- **Core Functionality**: All logging levels, configuration, child loggers
- **Structured Logging**: OpenTelemetry compatibility, custom serialization
- **Async Performance**: Low-footprint scenarios, backpressure handling
- **Transport System**: Console, file, HTTP, custom transports
- **Security**: Data sanitization, input validation, size limits
- **Error Handling**: Graceful fallbacks, never-throw guarantees
- **Memory Management**: Leak prevention, circular reference detection
- **Low-Footprint Scenarios**: optimizations, millisecond precision

```bash
# Run complete test suite
deno test --allow-read --allow-write --allow-net

# Run with coverage
deno test --coverage=coverage/ --allow-read --allow-write --allow-net
deno coverage coverage/ --html

# Performance benchmarks
deno bench --allow-read --allow-write
```

---

## Contributing

I welcome contributions! Please submit a pull request or open an issue for discussion.

### Development Setup

```bash
# Clone repository
git clone https://github.com/albedosehen/stoat.git
cd stoat

# Run tests
deno test --allow-read --allow-write --allow-net

# Run benchmarks
deno bench --allow-read --allow-write

# Format code
deno fmt

# Lint code
deno lint
```

---

## Support

Open an issue on GitHub for any questions, bugs, or feature requests.

## License

MIT License - see [LICENSE](LICENSE) file for details.
