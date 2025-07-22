/**
 * Stoat Context Schema
 * This module defines the schema for context objects in the Stoat system.
 * @module
 */

import type { RequestId, SpanId, Timestamp, TraceId } from '../types/brands.ts'

/**
 * Stoat Context Schema
 * This schema defines the structure of context objects used in Stoat logging.
 * Supports recursive parent context references for hierarchical context tracking.
 * Compatible with structured logging and observability requirements.
 *
 * @property {string} [orderId] - Optional associated order ID.
 * @property {string} [symbol] - Optional trading symbol.
 * @property {string} [strategy] - Optional trading strategy identifier.
 * @property {string} [agentId] - Optional agent identifier.
 * @property {string} [portfolioId] - Optional portfolio identifier.
 * @property {string} sessionId - Required session identifier.
 * @property {RequestId} [requestId] - Optional request identifier for correlation.
 * @property {string} [module] - Optional module identifier for context tracking.
 * @property {Record<string, unknown>} [metadata] - Optional additional metadata to include in context.
 * @property {StoatContext} [parentContext] - Optional parent context reference for hierarchical tracking.
 * @property {TraceId} [traceId] - Optional distributed tracing trace ID.
 * @property {SpanId} [spanId] - Optional span ID for distributed tracing.
 * @property {Timestamp} [timestamp] - Optional timestamp for the context.
 * @property {string} [version] - Optional version of the service or application.
 * @property {string} [environment] - Optional deployment environment.
 * @property {string} [component] - Optional subsystem or component identifier.
 * @property {string} [function] - Optional function name where the context originated.
 * @property {string[]} [tags] - Optional list of tags for categorization.
 * @property {number} [duration] - Optional duration in milliseconds for operations.
 * @property {object} [memoryUsage] - Optional memory usage metrics.
 * @property {number} [memoryUsage.rss] - Resident set size.
 * @property {number} [memoryUsage.heapUsed] - Heap memory used.
 * @property {number} [memoryUsage.heapTotal] - Total heap memory.
 * @property {number} [memoryUsage.external] - External memory.
 * @property {object} [cpuUsage] - Optional CPU usage metrics.
 * @property {number} [cpuUsage.user] - User CPU time.
 * @property {number} [cpuUsage.system] - System CPU time.
 */
export interface StoatContext {
  /** Associated order ID */
  orderId?: string
  /** Trading symbol */
  symbol?: string
  /** Trading strategy identifier */
  strategy?: string
  /** Agent identifier */
  agentId?: string
  /** Portfolio identifier */
  portfolioId?: string
  /** Session identifier */
  sessionId: string
  /** Request identifier for correlation */
  requestId?: RequestId
  /** Module identifier for context tracking */
  module?: string
  /** Additional metadata to include in context */
  metadata?: Record<string, unknown>
  /** Parent context reference */
  parentContext?: StoatContext
  /** Distributed tracing trace ID */
  traceId?: TraceId
  /** Span ID for distributed tracing */
  spanId?: SpanId
  /** Timestamp for the context */
  timestamp?: Timestamp
  /** Version of the service or application */
  version?: string
  /** Deployment environment */
  environment?: string
  /** Subsystem or component identifier */
  component?: string
  /** Function name where the context originated */
  function?: string
  /** User identifier */
  userId?: string
  /** List of tags for categorization */
  tags?: string[]
  /** Duration in milliseconds for operations */
  duration?: number
  /** Memory usage metrics */
  memoryUsage?: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  /** CPU usage metrics */
  cpuUsage?: {
    user: number
    system: number
  }
}
