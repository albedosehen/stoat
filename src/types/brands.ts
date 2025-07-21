/**
 * Branded types for type safety and domain modeling in STOAT logger
 * Uses TypeScript 5.x advanced features for compile-time guarantees
 */

// Base brand type for nominal typing
declare const __brand: unique symbol
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand }

// Core branded types for logging domain
export type LogLevel = Brand<string, 'LogLevel'>
export type TraceId = Brand<string, 'TraceId'>
export type SpanId = Brand<string, 'SpanId'>
export type RequestId = Brand<string, 'RequestId'>
export type SessionId = Brand<string, 'SessionId'>
export type Timestamp = Brand<string, 'Timestamp'>
export type LogMessage = Brand<string, 'LogMessage'>

// Security-related branded types
export type SensitiveData = Brand<unknown, 'SensitiveData'>
export type RedactedData = Brand<string, 'RedactedData'>
export type SanitizedInput = Brand<string, 'SanitizedInput'>

// Performance and trading-specific types
export type OperationId = Brand<string, 'OperationId'>
export type OrderId = Brand<string, 'OrderId'>
export type Symbol = Brand<string, 'Symbol'>
export type StrategyId = Brand<string, 'StrategyId'>
export type AgentId = Brand<string, 'AgentId'>
export type PortfolioId = Brand<string, 'PortfolioId'>

// Type constructors for creating branded values
export const createTraceId = (value: string): TraceId => value as TraceId
export const createSpanId = (value: string): SpanId => value as SpanId
export const createRequestId = (value: string): RequestId => value as RequestId
export const createSessionId = (value: string): SessionId => value as SessionId
export const createTimestamp = (value: string): Timestamp => value as Timestamp
export const createLogMessage = (value: string): LogMessage => value as LogMessage

export const createOperationId = (value: string): OperationId => value as OperationId
export const createOrderId = (value: string): OrderId => value as OrderId
export const createSymbol = (value: string): Symbol => value as Symbol
export const createStrategyId = (value: string): StrategyId => value as StrategyId
export const createAgentId = (value: string): AgentId => value as AgentId
export const createPortfolioId = (value: string): PortfolioId => value as PortfolioId

// Security type constructors
export const markSensitive = <T>(value: T): SensitiveData => value as SensitiveData
export const createRedacted = (value: string): RedactedData => value as RedactedData
export const createSanitized = (value: string): SanitizedInput => value as SanitizedInput

// Template literal types for compile-time log level validation
export type LogLevelString = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogLevelNumeric = 10 | 20 | 30 | 40 | 50 | 60

// Advanced conditional types for serializer registration
export type SerializerKey<T> = T extends object ? keyof T : never
export type SerializerValue<T, K extends SerializerKey<T>> = T extends object ? T[K] : never

// Utility types for plugin system
export type PluginContext = {
  logger: Logger
  config: StoatConfig
  timestamp: Timestamp
}

export type PluginHook<T = unknown> = (context: PluginContext, data: T) => Promise<T> | T

// Type aliases to avoid circular dependencies
export type Logger = import('../logging/structured.ts').StructuredLogger
export type StoatConfig = import('../config/schema.ts').StoatConfig

// Re-export LOG_LEVEL_VALUES from config/schema for convenience
export { LOG_LEVEL_VALUES } from '../config/schema.ts'
