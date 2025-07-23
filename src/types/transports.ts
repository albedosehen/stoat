/**
 * Transport Infrastructure for Stoat logging library
 * Defines all transport types and their configurations
 * @module
 */

import type { LogLevelName } from './logLevels.ts'

// Transport types for routing
export const TRANSPORT_TYPES = [
  'console',
  'file',
  'async',
  'memory',
  'custom',
] as const

export type TransportType = typeof TRANSPORT_TYPES[number]

// Base transport configuration interface
export interface TransportBase {
  type: TransportType
  level?: LogLevelName
  enabled?: boolean
  metadata?: Record<string, unknown>
}

// Console transport specific options
/**
 * Console transport interface for configuration
 * Defines the structure for console transport configuration in the transports array
 */
export interface ConsoleTransportInterface extends TransportBase {
  type: 'console'
  colors?: boolean
  prettyPrint?: boolean
}

// File transport specific options
export interface FileTransport extends TransportBase {
  type: 'file'
  destination: string
  maxFileSize?: number
  maxFiles?: number
  compress?: boolean
  append?: boolean
  rotation?: 'daily' | 'hourly' | 'size' | 'none'
}

// Async transport options for high-performance scenarios
export interface AsyncTransport extends TransportBase {
  type: 'async'
  bufferSize?: number
  flushInterval?: number
  maxBufferSize?: number
  syncOnExit?: boolean
  destination?: string
}

// Memory buffer transport for testing/debugging
export interface MemoryTransport extends TransportBase {
  type: 'memory'
  maxEntries?: number
  circular?: boolean
}

// Custom transport interface
export interface CustomTransport extends TransportBase {
  type: 'custom'
  target: string
  options?: Record<string, unknown>
}

// Backward compatibility type aliases
export type ConsoleTransport = ConsoleTransportInterface

// Union of all transport configurations
export type TransportConfig =
  | ConsoleTransportInterface
  | FileTransport
  | AsyncTransport
  | MemoryTransport
  | CustomTransport
