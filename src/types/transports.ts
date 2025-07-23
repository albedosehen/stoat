/**
 * Transport Infrastructure for Stoat logging library
 * Defines all transport types and their configurations
 * @module
 */

import type { LogLevelName } from './logLevels.ts'

/** Available transport types for log routing and output destinations. */
export const TRANSPORT_TYPES = [
  'console',
  'file',
  'async',
  'memory',
  'custom',
] as const

/** Union type for all available transport options. */
export type TransportType = typeof TRANSPORT_TYPES[number]

/** Base transport configuration interface shared by all transport types. */
export interface TransportBase {
  /** The type of transport */
  type: TransportType
  /** Minimum log level for this transport */
  level?: LogLevelName
  /** Whether this transport is enabled */
  enabled?: boolean
  /** Additional metadata for the transport */
  metadata?: Record<string, unknown>
}

/**
 * Console transport interface for configuration
 * Defines the structure for console transport configuration in the transports array
 */
export interface ConsoleTransportInterface extends TransportBase {
  /** Transport type identifier */
  type: 'console'
  /** Whether to use colors in console output */
  colors?: boolean
  /** Whether to use pretty-printed formatting */
  prettyPrint?: boolean
}

/** File transport interface for writing logs to files with rotation and compression options. */
export interface FileTransport extends TransportBase {
  /** Transport type identifier */
  type: 'file'
  /** File path destination for log output */
  destination: string
  /** Maximum file size in bytes before rotation */
  maxFileSize?: number
  /** Maximum number of rotated files to keep */
  maxFiles?: number
  /** Whether to compress rotated files */
  compress?: boolean
  /** Whether to append to existing files */
  append?: boolean
  /** File rotation strategy */
  rotation?: 'daily' | 'hourly' | 'size' | 'none'
}

/** Async transport interface for high-performance logging with buffering capabilities. */
export interface AsyncTransport extends TransportBase {
  /** Transport type identifier */
  type: 'async'
  /** Size of the internal buffer */
  bufferSize?: number
  /** Interval in milliseconds for automatic buffer flushing */
  flushInterval?: number
  /** Maximum buffer size before forced flush */
  maxBufferSize?: number
  /** Whether to synchronously flush on process exit */
  syncOnExit?: boolean
  /** Optional destination for async transport */
  destination?: string
}

/** Memory transport interface for storing logs in memory for testing and debugging. */
export interface MemoryTransport extends TransportBase {
  /** Transport type identifier */
  type: 'memory'
  /** Maximum number of log entries to store */
  maxEntries?: number
  /** Whether to use circular buffer (overwrite old entries) */
  circular?: boolean
}

/** Custom transport interface for user-defined transport implementations. */
export interface CustomTransport extends TransportBase {
  /** Transport type identifier */
  type: 'custom'
  /** Target module or function for custom transport */
  target: string
  /** Additional options for custom transport */
  options?: Record<string, unknown>
}

/** Backward compatibility type alias for console transport. */
export type ConsoleTransport = ConsoleTransportInterface

/** Union type representing all possible transport configurations. */
export type TransportConfig =
  | ConsoleTransportInterface
  | FileTransport
  | AsyncTransport
  | MemoryTransport
  | CustomTransport
