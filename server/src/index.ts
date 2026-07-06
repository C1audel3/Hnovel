import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { storyRouter } from './routes/stories.js'
import { chapterRouter } from './routes/chapters.js'
import { characterRouter } from './routes/characters.js'
import { exportRouter } from './routes/export.js'
import { initDatabase } from './db/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Long timeout for AI generation endpoints
app.use((_req, res, next) => {
  res.setTimeout(600_000) // 10 minutes
  next()
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// API Routes
app.use('/api/stories', storyRouter)
app.use('/api/stories', chapterRouter)
app.use('/api/stories', characterRouter)
app.use('/api/stories', exportRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' })
})

// Initialize database and start server
initDatabase()

app.listen(PORT, () => {
  console.log(`[Hnovel Server] Running on http://localhost:${PORT}`)
})

export default app
