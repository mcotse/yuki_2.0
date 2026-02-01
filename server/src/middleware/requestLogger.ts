import { createRequire } from 'module'
import type { IncomingMessage, ServerResponse } from 'http'
import type { HttpLogger, Options } from 'pino-http'
import { v4 as uuidv4 } from 'uuid'
import { logger, type Logger } from '../lib/logger.js'

const require = createRequire(import.meta.url)
const pinoHttp = require('pino-http') as (opts: Options) => HttpLogger

declare global {
  namespace Express {
    interface Request {
      log: Logger
      id: string
    }
  }
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) => {
    const existingId = req.headers['x-request-id']
    return (typeof existingId === 'string' ? existingId : null) || uuidv4()
  },
  customProps: (req: IncomingMessage) => ({
    request_id: (req as IncomingMessage & { id: string }).id,
  }),
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration_ms',
  },
  serializers: {
    req: (req: IncomingMessage) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res: ServerResponse) => ({
      status_code: res.statusCode,
    }),
  },
})
