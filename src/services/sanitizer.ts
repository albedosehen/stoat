/**
 * Input Sanitizer and Data Redactor
 * @module
 */
import type { RedactedData, SanitizedInput } from '../types/brands.ts'
import type { SecurityConfig } from '../types/schema.ts'
import { createErrorContext, DataRedactionError, InputSanitizationError, SecurityError } from '../errors/errors.ts'

/**
 * Default patterns for sensitive data redaction
 *
 * @property {RegExp} creditCard - Pattern for credit card numbers
 * @property {RegExp} ssn - Pattern for Social Security Numbers
 * @property {RegExp} phone - Pattern for phone numbers
 * @property {RegExp} email - Pattern for email addresses
 * @property {RegExp} ipAddress - Pattern for IP addresses
 * @property {RegExp} bearerToken - Pattern for Bearer tokens
 * @property {RegExp} apiKey - Pattern for API keys
 * @property {RegExp} password - Pattern for passwords
 * @property {RegExp} jwt - Pattern for JSON Web Tokens (JWTs)
 */
export const DEFAULT_SENSITIVE_PATTERNS = {
  creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  bearerToken: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  apiKey: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9\-._~+/]+=*['"]?/gi,
  password: /(?:password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]+['"]?/gi,
  jwt: /eyJ[A-Za-z0-9\-._~+/]+=*/g,
} as const

/**
 * Redaction replacements for sensitive data
 *
 * @property {string} [REDACTED-CC] - Replacement for credit card numbers
 * @property {string} [REDACTED-SSN] - Replacement for Social Security Numbers
 * @property {string} [REDACTED-PHONE] - Replacement for phone numbers
 * @property {string} [REDACTED-EMAIL] - Replacement for email addresses
 * @property {string} [REDACTED-IP] - Replacement for IP addresses
 * @property {string} [REDACTED-TOKEN] - Replacement for Bearer tokens
 * @property {string} [REDACTED-APIKEY] - Replacement for API keys
 * @property {string} [REDACTED-PASSWORD] - Replacement for passwords
 * @property {string} [REDACTED-JWT] - Replacement for JSON Web Tokens (JWTs)
 */
export const REDACTION_REPLACEMENTS = {
  '[REDACTED-CC]': 'creditCard',
  '[REDACTED-SSN]': 'ssn',
  '[REDACTED-PHONE]': 'phone',
  '[REDACTED-EMAIL]': 'email',
  '[REDACTED-IP]': 'ipAddress',
  '[REDACTED-TOKEN]': 'bearerToken',
  '[REDACTED-APIKEY]': 'apiKey',
  '[REDACTED-PASSWORD]': 'password',
  '[REDACTED-JWT]': 'jwt',
} as const

/**
 * Patterns for log injection prevention
 * These patterns are used to sanitize input strings to prevent log injection attacks.
 * @property {RegExp} crlf - Matches carriage return and line feed characters
 * @property {RegExp} ansiEscape - Matches ANSI escape sequences
 * @property {RegExp} nullByte - Matches null byte characters
 * @property {RegExp} formFeed - Matches form feed characters
 * @property {RegExp} verticalTab - Matches vertical tab characters
 * @property {RegExp} backspace - Matches backspace characters
 */
export const LOG_INJECTION_PATTERNS = {
  crlf: /[\r\n]/g,
  ansiEscape: new RegExp('\x1b\\[[0-9;]*[mGKH]', 'g'),
  nullByte: new RegExp('\x00', 'g'),
  formFeed: /\f/g,
  verticalTab: /\v/g,
  backspace: new RegExp('\x08', 'g'),
} as const

/**
 * Sanitization options for input strings
 *
 * @property {number} maxLength - Maximum length of the sanitized string
 * @property {boolean} allowNewlines - Whether to allow newlines in the sanitized string
 * @property {boolean} allowAnsiEscapes - Whether to allow ANSI escape sequences
 * @property {boolean} preserveSpacing - Whether to preserve original spacing in the sanitized string
 * @property {boolean} strictMode - Whether to apply strict sanitization rules (only alphanumeric, basic punctuation, and spaces)
 */
export interface SanitizationOptions {
  maxLength?: number
  allowNewlines?: boolean
  allowAnsiEscapes?: boolean
  preserveSpacing?: boolean
  strictMode?: boolean
}

/**
 * Redaction options for sensitive data
 *
 * @property {string[]} paths - Paths to redact in objects
 * @property {RegExp[]} patterns - Custom regex patterns for redaction
 * @property {Record<string, string>} customReplacements - Custom replacements for specific patterns
 * @property {boolean} deepRedaction - Whether to apply deep redaction on nested objects
 * @property {boolean} preserveStructure - Whether to preserve the original structure of the data
 * @property {number} maxDepth - Maximum depth for deep redaction
 */
export interface RedactionOptions {
  paths?: string[]
  patterns?: RegExp[]
  customReplacements?: Record<string, string>
  deepRedaction?: boolean
  preserveStructure?: boolean
  maxDepth?: number
}

/**
 * Input sanitizer class for sanitizing and redacting input strings and data
 *
 * This class provides methods to sanitize input strings to prevent log injection attacks,
 * redact sensitive data from any value, and validate input against security policies.
 * It supports custom redaction patterns and allows configuration of sanitization options.
 *
 * @property {SecurityConfig} config - Configuration for the sanitizer
 * @property {Map<string, RegExp>} customPatterns - Custom redaction patterns defined by the user
 * @throws {SecurityError} If a custom redaction pattern is invalid
 * @throws {InputSanitizationError} If sanitization fails
 * @throws {DataRedactionError} If redaction fails
 * @throws {Error} For any other unexpected errors during sanitization or redaction
 *
 * @example Basic usage:
 * ```typescript
 * const sanitizer = new InputSanitizer({ sanitizeInputs: true, redactPatterns: ['sensitivePattern'] });
 * const sanitizedInput = sanitizer.sanitize('Some input string');
 * const redactedData = sanitizer.redact(sensitiveData);
 * const isValid = sanitizer.validate('Input string to validate');
 * ```
 */
export class InputSanitizer {
  private config: SecurityConfig
  private customPatterns: Map<string, RegExp> = new Map()

  constructor(config: SecurityConfig) {
    this.config = config
    this.initializeCustomPatterns()
  }

  private initializeCustomPatterns(): void {
    for (const pattern of this.config.redactPatterns) {
      try {
        const regex = new RegExp(pattern, 'gi')
        this.customPatterns.set(pattern, regex)
      } catch (error) {
        throw new SecurityError(
          `Invalid redaction pattern: ${pattern}`,
          createErrorContext({ component: 'sanitizer' }),
          error as Error,
        )
      }
    }
  }

  /**
   * Sanitize input string to prevent log injection attacks
   */
  sanitize(input: string, options: SanitizationOptions = {}): SanitizedInput {
    if (!this.config.sanitizeInputs) {
      return input as SanitizedInput
    }

    try {
      let sanitized = input

      const maxLength = options.maxLength ?? this.config.maxStringLength
      if (sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength) + '...[TRUNCATED]'
      }

      if (!options.allowNewlines) {
        sanitized = sanitized.replace(LOG_INJECTION_PATTERNS.crlf, ' ')
      }

      if (!options.allowAnsiEscapes) {
        sanitized = sanitized.replace(LOG_INJECTION_PATTERNS.ansiEscape, '')
      }

      sanitized = sanitized
        .replace(LOG_INJECTION_PATTERNS.nullByte, '')
        .replace(LOG_INJECTION_PATTERNS.formFeed, ' ')
        .replace(LOG_INJECTION_PATTERNS.verticalTab, ' ')
        .replace(LOG_INJECTION_PATTERNS.backspace, '')

      if (!options.preserveSpacing) {
        sanitized = sanitized.replace(/\s+/g, ' ').trim()
      }

      if (options.strictMode) {
        sanitized = sanitized.replace(/[^\w\s.,!?;:()\-]/g, '')
      }

      return sanitized as SanitizedInput
    } catch (error) {
      throw new InputSanitizationError(
        input,
        createErrorContext({ component: 'sanitizer' }),
        error as Error,
      )
    }
  }

  /**
   * Redact sensitive data from any value
   */
  redact(value: unknown, options: RedactionOptions = {}): unknown {
    if (!this.config.enabled) {
      return value
    }

    try {
      return this.redactValue(value, options, 0)
    } catch (error) {
      throw new DataRedactionError(
        'unknown',
        createErrorContext({ component: 'sanitizer' }),
        error as Error,
      )
    }
  }

  private redactValue(value: unknown, options: RedactionOptions, depth: number): unknown {
    const maxDepth = options.maxDepth ?? 10

    if (depth > maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]'
    }

    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      return this.redactString(value, options)
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (value instanceof Date) {
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item, options, depth + 1))
    }

    if (typeof value === 'object') {
      return this.redactObject(value as Record<string, unknown>, options, depth)
    }

    return value
  }

  private redactString(str: string, options: RedactionOptions): RedactedData | string {
    let redacted = str

    for (const [replacement, patternKey] of Object.entries(REDACTION_REPLACEMENTS)) {
      const pattern = DEFAULT_SENSITIVE_PATTERNS[patternKey as keyof typeof DEFAULT_SENSITIVE_PATTERNS]
      if (pattern) {
        redacted = redacted.replace(pattern, replacement)
      }
    }

    for (const [, regex] of this.customPatterns) {
      redacted = redacted.replace(regex, '[REDACTED-CUSTOM]')
    }

    if (options.patterns) {
      for (const pattern of options.patterns) {
        redacted = redacted.replace(pattern, '[REDACTED]')
      }
    }

    return redacted === str ? str : (redacted as RedactedData)
  }

  private redactObject(
    obj: Record<string, unknown>,
    options: RedactionOptions,
    depth: number,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const redactPaths = options.paths ?? this.config.redactPaths

    for (const [key, value] of Object.entries(obj)) {
      const shouldRedactKey = redactPaths.some((path) => key.toLowerCase().includes(path.toLowerCase()))

      if (shouldRedactKey) {
        result[key] = '[REDACTED]'
      } else if (options.deepRedaction && typeof value === 'object' && value !== null) {
        result[key] = this.redactValue(value, options, depth + 1)
      } else {
        result[key] = this.redactValue(value, options, depth + 1)
      }
    }

    return result
  }

  /**
   * Check if a string contains potentially sensitive data
   *
   * @param input - The input string to check
   * @returns {boolean} True if the input contains sensitive data, false otherwise
   */
  containsSensitiveData(input: string): boolean {
    // Check against built-in patterns
    for (const pattern of Object.values(DEFAULT_SENSITIVE_PATTERNS)) {
      if (pattern.test(input)) {
        return true
      }
    }

    for (const regex of this.customPatterns.values()) {
      if (regex.test(input)) {
        return true
      }
    }

    return false
  }

  /**
   * Add custom redaction pattern
   *
   * @param name - Name of the custom pattern
   * @param {RegExp} pattern - Regular expression for the custom pattern
   */
  addRedactionPattern(name: string, pattern: RegExp): void {
    this.customPatterns.set(name, pattern)
  }

  /**
   * Remove custom redaction pattern
   *
   * @param name - Name of the custom pattern to remove
   */
  removeRedactionPattern(name: string): boolean {
    return this.customPatterns.delete(name)
  }

  /**
   * Get all active redaction patterns
   */
  getRedactionPatterns(): Record<string, RegExp> {
    const patterns: Record<string, RegExp> = {}

    // built-ins
    for (const [name, pattern] of Object.entries(DEFAULT_SENSITIVE_PATTERNS)) {
      patterns[name] = pattern
    }

    // custom
    for (const [name, pattern] of this.customPatterns) {
      patterns[name] = pattern
    }

    return patterns
  }

  /**
   * Validate that input is safe for logging
   */
  validate(input: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    if (input.length > this.config.maxStringLength) {
      issues.push(`Input exceeds maximum length (${this.config.maxStringLength})`)
    }

    if (LOG_INJECTION_PATTERNS.crlf.test(input)) {
      issues.push('Contains CRLF injection characters')
    }

    if (LOG_INJECTION_PATTERNS.ansiEscape.test(input)) {
      issues.push('Contains ANSI escape sequences')
    }

    if (LOG_INJECTION_PATTERNS.nullByte.test(input)) {
      issues.push('Contains null bytes')
    }

    if (this.containsSensitiveData(input)) {
      issues.push('Contains potentially sensitive data')
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * Update configuration
   *
   * @param {Partial<SecurityConfig>} config - Partial configuration to update
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.redactPatterns) {
      this.customPatterns.clear()
      this.initializeCustomPatterns()
    }
  }
}

/**
 * Sanitize user input to prevent security issues
 * @param input The input string to sanitize
 * @param config The security configuration to use
 * @param {SanitizationOptions} options Optional sanitization options
 * @returns The sanitized input
 */
export function sanitizeInput(input: string, config: SecurityConfig, options?: SanitizationOptions): SanitizedInput {
  const sanitizer = new InputSanitizer(config)
  return sanitizer.sanitize(input, options)
}

/**
 * Redact sensitive data from any value
 * @param data The data to redact
 * @param {SecurityConfig} config The security configuration to use
 * @param {RedactionOptions} options Optional redaction options
 * @returns The redacted data
 */
export function redactSensitiveData(data: unknown, config: SecurityConfig, options?: RedactionOptions): unknown {
  const sanitizer = new InputSanitizer(config)
  return sanitizer.redact(data, options)
}

/**
 * Validate input against security policies
 * @param input The input string to validate
 * @param {SecurityConfig} config The security configuration to use
 * @returns An object containing validation result and issues
 */
export function validateLogInput(input: string, config: SecurityConfig): { isValid: boolean; issues: string[] } {
  const sanitizer = new InputSanitizer(config)
  return sanitizer.validate(input)
}

/**
 * Create a new InputSanitizer instance with the given configuration
 * @param {SecurityConfig} config The security configuration to use
 * @returns A new InputSanitizer instance
 */
export function createSanitizer(config: SecurityConfig): InputSanitizer {
  return new InputSanitizer(config)
}
