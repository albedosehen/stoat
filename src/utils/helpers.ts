/**
 * Utility functions for working with enumerations in TypeScript
 * @module
 */

/**
 * Extracts the values from an enum-like object for use with Zod's z.enum()
 * @param enumObject - The enum object to extract values from
 * @returns Array of enum values as a tuple for TypeScript inference
 */
export function EnumValues<T extends Record<string, string | number>>(
  enumObject: T,
): [T[keyof T], ...T[keyof T][]] {
  const values = Object.values(enumObject) as T[keyof T][]
  return [values[0], ...values.slice(1)] as [T[keyof T], ...T[keyof T][]]
}
