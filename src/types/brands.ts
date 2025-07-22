/**
 * Branded types for type safety and domain modeling in Stoat logger
 * @module
 */

import { StructuredLogger } from '../logging/structured.ts'
import type { StoatConfig } from '../stoat/config.ts'

// Base brand type for nominal typing
declare const __brand: unique symbol

// Generic brand type constructor
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand }

// Log level types for structured logging
export type LogLevel = Brand<string, 'LogLevel'>
// Common identifiers for tracing and logging
export type TraceId = Brand<string, 'TraceId'>
// Unique identifiers for spans and requests
export type SpanId = Brand<string, 'SpanId'>
// Unique identifiers for requests and sessions
export type RequestId = Brand<string, 'RequestId'>
// Unique identifiers for sessions
export type SessionId = Brand<string, 'SessionId'>
// Timestamp for log messages
export type Timestamp = Brand<string, 'Timestamp'>
// Structured log messages with type safety
export type LogMessage = Brand<string, 'LogMessage'>

// Sensitive data that should not be logged directly
export type SensitiveData = Brand<unknown, 'SensitiveData'>
// Redacted and sanitized data types for security
export type RedactedData = Brand<string, 'RedactedData'>
// Sanitized input types for safe logging
export type SanitizedInput = Brand<string, 'SanitizedInput'>

// Performance and trading-specific types
export type OperationId = Brand<string, 'OperationId'>
// Unique identifiers for orders, symbols, strategies, agents, and portfolios
export type OrderId = Brand<string, 'OrderId'>
// Unique identifiers for financial instruments
export type Symbol = Brand<string, 'Symbol'>
// Unique identifiers for trading strategies, agents, and portfolios
export type StrategyId = Brand<string, 'StrategyId'>
// Unique identifiers for agents and portfolios in trading systems
export type AgentId = Brand<string, 'AgentId'>
// Unique identifiers for portfolios in trading systems
export type PortfolioId = Brand<string, 'PortfolioId'>

/**
 * Creates a new TraceId
 * @param value - The string value to brand as a TraceId
 * @returns A branded TraceId
 */
export const createTraceId = (value: string): TraceId => value as TraceId

/**
 * Creates a new LogLevel
 * @param value - The string value to brand as a LogLevel
 * @returns A branded LogLevel
 */
export const createSpanId = (value: string): SpanId => value as SpanId

/**
 * Creates a new RequestId
 * @param value - The string value to brand as a RequestId
 * @returns A branded RequestId
 */
export const createRequestId = (value: string): RequestId => value as RequestId

/**
 * Creates a new SessionId
 * @param value - The string value to brand as a SessionId
 * @returns A branded SessionId
 */
export const createSessionId = (value: string): SessionId => value as SessionId

/**
 * Creates a new Timestamp
 * @param value - The string value to brand as a Timestamp
 * @returns A branded Timestamp
 */
export const createTimestamp = (value: string): Timestamp => value as Timestamp

/**
 * Creates a new LogMessage
 * @param value - The string value to brand as a LogMessage
 * @returns A branded LogMessage
 */
export const createLogMessage = (value: string): LogMessage => value as LogMessage

/**
 * Creates a new OperationId
 * @param value - The string value to brand as a OperationId
 * @returns A branded OperationId
 */
export const createOperationId = (value: string): OperationId => value as OperationId

/**
 * Creates a new OrderId
 * @param value - The string value to brand as a OrderId
 * @returns A branded OrderId
 */
export const createOrderId = (value: string): OrderId => value as OrderId

/**
 * Creates a new Symbol
 * @param value - The string value to brand as a Symbol
 * @returns A branded Symbol
 */
export const createSymbol = (value: string): Symbol => value as Symbol

/**
 * Creates a new StrategyId
 * @param value - The string value to brand as a StrategyId
 * @returns A branded StrategyId
 */
export const createStrategyId = (value: string): StrategyId => value as StrategyId

/**
 * Creates a new AgentId
 * @param value - The string value to brand as a AgentId
 * @returns A branded AgentId
 */
export const createAgentId = (value: string): AgentId => value as AgentId

/**
 * Creates a new PortfolioId
 * @param value - The string value to brand as a PortfolioId
 * @returns A branded PortfolioId
 */
export const createPortfolioId = (value: string): PortfolioId => value as PortfolioId

/**
 * Creates a new SensitiveData
 * @param value - The value to mark as sensitive data
 * @returns A branded SensitiveData
 */
export const markSensitive = <T>(value: T): SensitiveData => value as SensitiveData

/**
 * Creates a new RedactedData
 * @param value - The string value to brand as RedactedData
 * @returns A branded RedactedData
 */
export const createRedacted = (value: string): RedactedData => value as RedactedData

/**
 * Creates a new SanitizedInput
 * @param value - The string value to brand as SanitizedInput
 * @returns A branded SanitizedInput
 */
export const createSanitized = (value: string): SanitizedInput => value as SanitizedInput

/**
 * Utility function to check if a value is a branded type
 *
 * @param value - The value to check
 * @param brand - The brand to check against
 */
export type LogLevelString = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Numeric representation of log levels
 */
export type LogLevelNumeric = 10 | 20 | 30 | 40 | 50 | 60

/**
 * Utility type to extract keys and values from branded objects
 */
export type SerializerKey<T> = T extends object ? keyof T : never

/**
 * Utility type to extract values from branded objects
 */
export type SerializerValue<T, K extends SerializerKey<T>> = T extends object ? T[K] : never

/**
 * Context object for plugin execution
 */
export type PluginContext = {
  logger: StructuredLogger
  config: StoatConfig
  timestamp: Timestamp
}

/**
 * Plugin hook type for asynchronous or synchronous operations
 * @param context - The plugin context containing logger and config
 * @param data - The data to process, can be any type
 * @returns Processed data, can be a Promise or direct value
 */
export type PluginHook<T = unknown> = (context: PluginContext, data: T) => Promise<T> | T
