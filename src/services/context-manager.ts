/**
 * Context system with trace correlation IDs and request scoping for STOAT logger
 * Provides automatic correlation tracking and context inheritance for modern observability
 * @module
 */

import {
  type AgentId,
  createOperationId,
  createRequestId,
  createSessionId,
  createSpanId,
  createTimestamp,
  createTraceId,
  type OperationId,
  type OrderId,
  type PortfolioId,
  type RequestId,
  type SessionId,
  type SpanId,
  type StrategyId,
  type Symbol,
  type Timestamp,
  type TraceId,
} from '../types/brands.ts'
import type { ContextConfig } from '../types/config.ts'
import { createErrorContext, ValidationError } from '../errors/errors.ts'

// Base context interface with correlation and observability fields
export interface BaseContext {
  readonly timestamp: Timestamp
  readonly sessionId: SessionId
  readonly traceId?: TraceId
  readonly spanId?: SpanId
  readonly requestId?: RequestId
  readonly operationId?: OperationId
  readonly parentContext?: BaseContext
}

// Trading-specific context fields
export interface TradingContext {
  readonly orderId?: OrderId
  readonly symbol?: Symbol
  readonly strategy?: StrategyId
  readonly agentId?: AgentId
  readonly portfolioId?: PortfolioId
  readonly executionId?: string
  readonly venue?: string
  readonly accountId?: string
}

// Application context fields
export interface ApplicationContext {
  readonly userId?: string
  readonly organizationId?: string
  readonly tenantId?: string
  readonly environment?: string
  readonly version?: string
  readonly component?: string
  readonly module?: string
  readonly function?: string
}

// Request context fields for web applications
export interface RequestContext {
  readonly method?: string
  readonly url?: string
  readonly userAgent?: string
  readonly ip?: string
  readonly headers?: Record<string, string>
  readonly query?: Record<string, string>
  readonly body?: unknown
  readonly responseStatus?: number
  readonly duration?: number
}

// Performance context fields
export interface PerformanceContext {
  readonly startTime?: number
  readonly endTime?: number
  readonly duration?: number
  readonly memoryUsage?: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  readonly cpuUsage?: {
    user: number
    system: number
  }
}

// Full context interface combining all context types
export interface StoatContext
  extends BaseContext, TradingContext, ApplicationContext, RequestContext, PerformanceContext {
  readonly metadata?: Record<string, unknown>
  readonly tags?: string[]
  readonly custom?: Record<string, unknown>
}

// Context creation options
export interface ContextOptions {
  enableAutoCorrelation?: boolean
  inheritFromParent?: boolean
  generateTraceId?: boolean
  generateSpanId?: boolean
  validateContext?: boolean
  maxDepth?: number
  preserveOriginal?: boolean
}

// Context validation schema
export interface ContextValidation {
  requiredFields?: (keyof StoatContext)[]
  maxFieldLength?: number
  maxMetadataSize?: number
  allowedCustomFields?: string[]
  forbiddenFields?: string[]
}

/**
 * ContextManager class
 * Manages context creation, inheritance, and correlation tracking
 * @class ContextManager
 * @param {ContextConfig} config - Configuration for the context manager
 * @property {ContextConfig} config - Configuration for the context manager
 * @property {StoatContext | null} currentContext - The currently active context
 * @property {StoatContext[]} contextStack - Stack of contexts for nested operations
 * @property {Map<string, string>} correlationHeaders - Map of correlation headers to context fields
 */
export class ContextManager {
  private config: ContextConfig
  private currentContext: StoatContext | null = null
  private contextStack: StoatContext[] = []
  private correlationHeaders: Map<string, string> = new Map()

  constructor(config: ContextConfig) {
    this.config = config
    this.initializeCorrelationHeaders()
  }

  private initializeCorrelationHeaders(): void {
    this.correlationHeaders.set('x-trace-id', 'traceId')
    this.correlationHeaders.set('x-span-id', 'spanId')
    this.correlationHeaders.set('x-request-id', 'requestId')
    this.correlationHeaders.set('x-correlation-id', 'requestId')
    this.correlationHeaders.set('x-session-id', 'sessionId')
    this.correlationHeaders.set('x-operation-id', 'operationId')
  }

  /**
   * Create a new context with optional parent inheritance
   */
  createContext(
    contextData: Partial<StoatContext> = {},
    options: ContextOptions = {},
  ): StoatContext {
    const opts = {
      enableAutoCorrelation: this.config.enableAutoCorrelation,
      inheritFromParent: this.config.enableInheritance,
      generateTraceId: true,
      generateSpanId: true,
      validateContext: this.config.enableContextValidation,
      maxDepth: 10,
      preserveOriginal: false,
      ...options,
    }

    let baseContext: Partial<StoatContext> = {}

    // Inherit from parent context if enabled
    if (opts.inheritFromParent && this.currentContext) {
      baseContext = this.inheritFromParent(this.currentContext, opts.maxDepth)
    }

    // Apply default fields from config
    if (this.config.defaultFields) {
      baseContext = { ...baseContext, ...this.config.defaultFields }
    }

    // Generate required IDs
    const context: StoatContext = {
      ...baseContext,
      ...contextData,
      timestamp: createTimestamp(new Date().toISOString()),
      sessionId: contextData.sessionId ?? this.generateSessionId(),
      traceId: opts.generateTraceId ? (contextData.traceId ?? this.generateTraceId()) : contextData.traceId,
      spanId: opts.generateSpanId ? (contextData.spanId ?? this.generateSpanId()) : contextData.spanId,
      parentContext: opts.inheritFromParent ? (this.currentContext ?? undefined) : undefined,
    }

    // Auto-correlation from environment or async local storage
    if (opts.enableAutoCorrelation) {
      this.applyAutoCorrelation(context)
    }

    // Validate context if enabled
    if (opts.validateContext) {
      this.validateContext(context)
    }

    return context
  }

  /**
   * Create a child context that inherits from the current context
   */
  createChildContext(
    contextData: Partial<StoatContext> = {},
    options: ContextOptions = {},
  ): StoatContext {
    return this.createContext(contextData, {
      ...options,
      inheritFromParent: true,
      generateSpanId: true, // Always generate new span for child
    })
  }

  /**
   * Set the current active context
   */
  setContext(context: StoatContext): void {
    this.currentContext = context
  }

  /**
   * Get the current active context
   */
  getContext(): StoatContext | null {
    return this.currentContext
  }

  /**
   * Push context onto stack and set as current
   */
  pushContext(context: StoatContext): void {
    if (this.currentContext) {
      this.contextStack.push(this.currentContext)
    }
    this.currentContext = context
  }

  /**
   * Pop context from stack and restore previous
   */
  popContext(): StoatContext | null {
    const popped = this.currentContext
    this.currentContext = this.contextStack.pop() ?? null
    return popped
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.currentContext = null
    this.contextStack = []
  }

  /**
   * Extract correlation IDs from HTTP headers
   */
  extractFromHeaders(headers: Record<string, string>): Partial<StoatContext> {
    const context: Record<string, unknown> = {}

    for (const [headerName, contextField] of this.correlationHeaders) {
      const headerValue = headers[headerName] || headers[headerName.toLowerCase()]
      if (headerValue) {
        switch (contextField) {
          case 'traceId':
            context.traceId = createTraceId(headerValue)
            break
          case 'spanId':
            context.spanId = createSpanId(headerValue)
            break
          case 'requestId':
            context.requestId = createRequestId(headerValue)
            break
          case 'sessionId':
            context.sessionId = createSessionId(headerValue)
            break
          case 'operationId':
            context.operationId = createOperationId(headerValue)
            break
        }
      }
    }

    return context as Partial<StoatContext>
  }

  /**
   * Create headers from context for outgoing requests
   */
  createHeaders(context: StoatContext = this.currentContext!): Record<string, string> {
    const headers: Record<string, string> = {}

    if (!context) return headers

    if (context.traceId) headers['x-trace-id'] = context.traceId
    if (context.spanId) headers['x-span-id'] = context.spanId
    if (context.requestId) headers['x-request-id'] = context.requestId
    if (context.sessionId) headers['x-session-id'] = context.sessionId
    if (context.operationId) headers['x-operation-id'] = context.operationId

    return headers
  }

  /**
   * Merge multiple contexts with priority order
   */
  mergeContexts(...contexts: Partial<StoatContext>[]): StoatContext {
    const merged = contexts.reduce((acc, ctx) => ({ ...acc, ...ctx }), {})

    // Ensure required fields are present
    return {
      timestamp: createTimestamp(new Date().toISOString()),
      sessionId: this.generateSessionId(),
      ...merged,
    } as StoatContext
  }

  /**
   * Create context for trading operations
   */
  createTradingContext(
    tradingData: TradingContext,
    baseContext?: Partial<StoatContext>,
  ): StoatContext {
    return this.createContext({
      ...baseContext,
      ...tradingData,
      component: 'trading',
      tags: ['trading', ...(baseContext?.tags ?? [])],
    })
  }

  /**
   * Create context for web requests
   */
  createRequestContext(
    requestData: RequestContext,
    baseContext?: Partial<StoatContext>,
  ): StoatContext {
    return this.createContext({
      ...baseContext,
      ...requestData,
      component: 'web',
      tags: ['web', 'request', ...(baseContext?.tags ?? [])],
    })
  }

  /**
   * Create context for performance monitoring
   */
  createPerformanceContext(
    perfData: PerformanceContext,
    baseContext?: Partial<StoatContext>,
  ): StoatContext {
    return this.createContext({
      ...baseContext,
      ...perfData,
      component: 'performance',
      tags: ['performance', ...(baseContext?.tags ?? [])],
    })
  }

  private inheritFromParent(parent: StoatContext, maxDepth: number): Partial<StoatContext> {
    // Prevent infinite recursion
    let depth = 0
    let current = parent
    while (current.parentContext && depth < maxDepth) {
      current = current.parentContext
      depth++
    }

    return {
      traceId: parent.traceId,
      sessionId: parent.sessionId,
      // Don't inherit spanId - each child gets a new span
      requestId: parent.requestId,
      userId: parent.userId,
      organizationId: parent.organizationId,
      tenantId: parent.tenantId,
      environment: parent.environment,
      version: parent.version,
      component: parent.component,
      module: parent.module,
      metadata: parent.metadata ? { ...parent.metadata } : undefined,
      tags: parent.tags ? [...parent.tags] : undefined,
    }
  }

  private applyAutoCorrelation(context: StoatContext): void {
    // This would integrate with Deno's AsyncContext or similar when available
    // For now, we'll check environment variables and global state

    const global = globalThis as Record<string, unknown>

    if (!context.traceId && global.STOAT_TRACE_ID) {
      ;(context as unknown as Record<string, unknown>).traceId = createTraceId(global.STOAT_TRACE_ID as string)
    }

    if (!context.requestId && global.STOAT_REQUEST_ID) {
      ;(context as unknown as Record<string, unknown>).requestId = createRequestId(global.STOAT_REQUEST_ID as string)
    }
  }

  private validateContext(context: StoatContext): void {
    if (!this.config.enableContextValidation) return

    // Check context size
    const contextStr = JSON.stringify(context)
    if (this.config.maxContextSize && contextStr.length > this.config.maxContextSize) {
      throw new ValidationError(
        `Context size exceeds maximum (${this.config.maxContextSize})`,
        createErrorContext({ component: 'context' }),
      )
    }

    // Validate required correlation IDs
    if (!context.sessionId) {
      throw new ValidationError(
        'Context must have a sessionId',
        createErrorContext({ component: 'context' }),
      )
    }

    if (!context.timestamp) {
      throw new ValidationError(
        'Context must have a timestamp',
        createErrorContext({ component: 'context' }),
      )
    }
  }

  private generateSessionId(): SessionId {
    const length = this.config.sessionIdLength ?? 8
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return createSessionId(result)
  }

  private generateTraceId(): TraceId {
    return createTraceId(crypto.randomUUID().replace(/-/g, ''))
  }

  private generateSpanId(): SpanId {
    return createSpanId(Math.random().toString(16).slice(2, 18))
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get context statistics
   */
  getStats(): {
    currentDepth: number
    stackSize: number
    hasActiveContext: boolean
    contextSize: number
  } {
    let depth = 0
    let current = this.currentContext
    while (current?.parentContext && depth < 50) { // Prevent infinite loop
      current = current.parentContext
      depth++
    }

    return {
      currentDepth: depth,
      stackSize: this.contextStack.length,
      hasActiveContext: this.currentContext !== null,
      contextSize: this.currentContext ? JSON.stringify(this.currentContext).length : 0,
    }
  }
}

// Global context manager instance (singleton pattern)
let globalContextManager: ContextManager | null = null

/**
 * Get or create the global context manager
 */
export function getGlobalContextManager(config?: ContextConfig): ContextManager {
  if (!globalContextManager && config) {
    globalContextManager = new ContextManager(config)
  }
  if (!globalContextManager) {
    throw new Error('Context manager not initialized. Call with config first.')
  }
  return globalContextManager
}

/**
 * Utility functions for easy context operations
 */
export function createContext(
  contextData?: Partial<StoatContext>,
  options?: ContextOptions,
): StoatContext {
  const manager = getGlobalContextManager()
  return manager.createContext(contextData, options)
}

export function getCurrentContext(): StoatContext | null {
  const manager = getGlobalContextManager()
  return manager.getContext()
}

export function setCurrentContext(context: StoatContext): void {
  const manager = getGlobalContextManager()
  manager.setContext(context)
}

export function withContext<T>(
  context: StoatContext,
  fn: () => T,
): T {
  const manager = getGlobalContextManager()
  manager.pushContext(context)
  try {
    return fn()
  } finally {
    manager.popContext()
  }
}

export async function withContextAsync<T>(
  context: StoatContext,
  fn: () => Promise<T>,
): Promise<T> {
  const manager = getGlobalContextManager()
  manager.pushContext(context)
  try {
    return await fn()
  } finally {
    manager.popContext()
  }
}

// Type guards for context validation
export function isValidContext(obj: unknown): obj is StoatContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'timestamp' in obj &&
    'sessionId' in obj
  )
}

export function isBaseContext(obj: unknown): obj is BaseContext {
  return isValidContext(obj)
}

export function isTradingContext(obj: unknown): obj is StoatContext & TradingContext {
  return isValidContext(obj) && ('orderId' in obj || 'symbol' in obj || 'strategy' in obj)
}

export function isRequestContext(obj: unknown): obj is StoatContext & RequestContext {
  return isValidContext(obj) && ('method' in obj || 'url' in obj)
}
