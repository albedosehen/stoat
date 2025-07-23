/**
 * Stoat Utils Module
 * This module exports utility functions and classes used throughout the Stoat logging system.
 * @module
 */

// Helper functions
export {
  EnumValues,
} from './helpers.ts'

// Serializer utilities
export {
  CustomSerializerEngine,
  type CustomSerializer,
  type CustomSerializerEngine as CustomSerializerEngineType,
  getDefaultSerializer,
  type SerializationContext,
  type SerializationResult,
  serialize,
  serializeFast,
  type SerializerConfig,
  createSerializer,
} from './serializer.ts'

// Timer utility
export {
  Timer,
} from './timer.ts'

