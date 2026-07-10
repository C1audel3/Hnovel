import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { storyRouter } from './routes/stories.js'
import { chapterRouter } from './routes/chapters.js'
import { characterRouter } from './routes/characters.js'
import { exportRouter } from './routes/export.js'
import { planningRouter } from './routes/planning.js'
import { initDatabase } from './db/index.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const WEB_DIST_DIR = path.resolve(process.cwd(), '..', 'web', 'dist')

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
app.use('/api/stories', planningRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' })
})

app.get('/api/health/llm', async (_req, res) => {
  const apiKey = process.env.LLM_API_KEY || ''
  const baseURL = process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1'
  const model = process.env.LLM_MODEL || 'deepseek-v4-flash'

  if (!apiKey) {
    return res.status(400).json({
      ok: false,
      configured: false,
      baseURL,
      model,
      error: 'LLM_API_KEY is not configured',
    })
  }

  try {
    const client = new OpenAI({ apiKey, baseURL })
    const response = await client.chat.completions.create({
      model,
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
    })
    res.json({
      ok: true,
      configured: true,
      baseURL,
      model,
      sample: response.choices[0]?.message?.content || '',
    })
  } catch (error) {
    res.status(502).json({
      ok: false,
      configured: true,
      baseURL,
      model,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

if (fs.existsSync(WEB_DIST_DIR)) {
  app.use(express.static(WEB_DIST_DIR))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(WEB_DIST_DIR, 'index.html'))
  })
}

app.use(notFoundHandler)
app.use(errorHandler)

// Initialize database and start server
initDatabase()

app.listen(PORT, () => {
  console.log(`[Hnovel Server] Running on http://localhost:${PORT}`)
})

export default app
