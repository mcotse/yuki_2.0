import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initializePool, closePool } from './db.js'
import { logger } from './lib/logger.js'
import { requestLogger } from './middleware/requestLogger.js'
import usersRouter from './routes/users.js'
import petsRouter from './routes/pets.js'
import itemsRouter from './routes/items.js'
import schedulesRouter from './routes/schedules.js'
import instancesRouter from './routes/instances.js'
import historyRouter from './routes/history.js'
import conflictGroupsRouter from './routes/conflict-groups.js'
import testFixturesRouter from './routes/test-fixtures.js'

const app = express()
const port = process.env.PORT || 3000

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(requestLogger)
app.use(express.json())

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/users', usersRouter)
app.use('/api/pets', petsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/schedules', schedulesRouter)
app.use('/api/instances', instancesRouter)
app.use('/api/history', historyRouter)
app.use('/api/conflict-groups', conflictGroupsRouter)
app.use('/api/test-fixtures', testFixturesRouter)

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = req.id || 'unknown'
  logger.error({
    event: 'request_error',
    request_id: requestId,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
  })
  res.status(500).json({ error: err.message })
})

async function start() {
  try {
    await initializePool()
    app.listen(port, () => {
      logger.info({ event: 'server_started', port }, `Server running on http://localhost:${port}`)
    })
  } catch (error) {
    logger.fatal({ event: 'server_start_failed', error }, 'Failed to start server')
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info({ event: 'server_shutdown', signal: 'SIGTERM' }, 'Shutting down...')
  await closePool()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info({ event: 'server_shutdown', signal: 'SIGINT' }, 'Shutting down...')
  await closePool()
  process.exit(0)
})

start()
