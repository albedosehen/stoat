export const LOG_LEVEL = {
  Trace: 'trace',
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
  Fatal: 'fatal',
} as const
export type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL]

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LOG_LEVEL.Trace]: 0,
  [LOG_LEVEL.Debug]: 1,
  [LOG_LEVEL.Info]: 2,
  [LOG_LEVEL.Warn]: 3,
  [LOG_LEVEL.Error]: 4,
  [LOG_LEVEL.Fatal]: 5,
} as const
export type LogLevelPriority = typeof LOG_LEVEL_PRIORITY[keyof typeof LOG_LEVEL_PRIORITY]

export const LOG_SEVERITY_COLORS = {
  Trace: '\x1b[90m', // Gray
  Debug: '\x1b[36m', // Cyan
  Info: '\x1b[32m', // Green
  Warn: '\x1b[33m', // Yellow
  Error: '\x1b[31m', // Red
  Fatal: '\x1b[35m', // Magenta
} as const
export type LogColor = typeof LOG_SEVERITY_COLORS[keyof typeof LOG_SEVERITY_COLORS]

export const LOG_LEVEL_CONFIG = {
  [LOG_LEVEL.Trace]: { value: 0, color: LOG_SEVERITY_COLORS.Trace },
  [LOG_LEVEL.Debug]: { value: 1, color: LOG_SEVERITY_COLORS.Debug },
  [LOG_LEVEL.Info]: { value: 2, color: LOG_SEVERITY_COLORS.Info },
  [LOG_LEVEL.Warn]: { value: 3, color: LOG_SEVERITY_COLORS.Warn },
  [LOG_LEVEL.Error]: { value: 4, color: LOG_SEVERITY_COLORS.Error },
  [LOG_LEVEL.Fatal]: { value: 5, color: LOG_SEVERITY_COLORS.Fatal },
} as const satisfies Record<LogLevel, { value: number; color: string }>
export type LogLevelConfig = typeof LOG_LEVEL_CONFIG[keyof typeof LOG_LEVEL_CONFIG]
