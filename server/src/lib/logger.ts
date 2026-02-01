import pino from 'pino'

const isDevelopment = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  base: {
    service: 'yuki-care-api',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
})

export type Logger = pino.Logger

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings)
}
