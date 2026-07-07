import { Router, Request, Response } from 'express'
import { getDatabase } from '../db/index.js'
import { randomUUID } from 'crypto'
import fs from 'fs'
import { storyCreateSchema, storyUpdateSchema, validateBody } from '../middleware/validation.js'

export const storyRouter = Router()

// List all stories
storyRouter.get('/', (_req: Request, res: Response) => {
  const db = getDatabase()
  const stories = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count,
      (SELECT COUNT(*) FROM characters ch WHERE ch.story_id = s.id) as character_count,
      COALESCE((SELECT SUM(word_count) FROM chapters c WHERE c.story_id = s.id), 0) as total_words
    FROM stories s
    ORDER BY s.updated_at DESC
  `).all()
  res.json(stories)
})

// Get story by ID
storyRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count,
      (SELECT COUNT(*) FROM characters ch WHERE ch.story_id = s.id) as character_count,
      COALESCE((SELECT SUM(word_count) FROM chapters c WHERE c.story_id = s.id), 0) as total_words
    FROM stories s WHERE s.id = ?
  `).get(String(req.params.id))

  if (!story) {
    return res.status(404).json({ error: 'Story not found' })
  }
  res.json(story)
})

// Create new story
storyRouter.post('/', validateBody(storyCreateSchema), (req: Request, res: Response) => {
  const db = getDatabase()
  const id = randomUUID()
  const {
    title, genre, sub_genre, setting_era, rating, nsfw_tags,
    explicit_level, target_audience, pov, tense, synopsis, themes
  } = req.body

  db.prepare(`
    INSERT INTO stories (id, title, genre, sub_genre, setting_era, rating, nsfw_tags,
      explicit_level, target_audience, pov, tense, synopsis, themes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, genre || 'school', sub_genre, setting_era,
    rating || 'nsfw', JSON.stringify(nsfw_tags || []),
    explicit_level || 'moderate', target_audience || 'male',
    pov || 'third-person-limited', tense || 'past', synopsis,
    JSON.stringify(themes || []))

  // Also create the story directory on disk
  const storyDir = `${process.env.DATA_DIR || '../story-output'}/${id}`
  if (!fs.existsSync(storyDir)) {
    fs.mkdirSync(storyDir, { recursive: true })
    fs.mkdirSync(`${storyDir}/chapters`, { recursive: true })
    fs.mkdirSync(`${storyDir}/characters`, { recursive: true })
  }

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id)
  res.status(201).json(story)
})

// Update story
storyRouter.put('/:id', validateBody(storyUpdateSchema), (req: Request, res: Response) => {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id))
  if (!existing) {
    return res.status(404).json({ error: 'Story not found' })
  }

  const fields = ['title', 'genre', 'sub_genre', 'setting_era', 'status', 'rating',
    'nsfw_tags', 'explicit_level', 'target_audience', 'pov', 'tense', 'synopsis', 'tone_style', 'reference_style', 'style_profile', 'themes']
  const updates: string[] = []
  const values: any[] = []

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      const value = ['nsfw_tags', 'themes'].includes(field)
        ? JSON.stringify(req.body[field])
        : req.body[field]
      updates.push(`${field} = ?`)
      values.push(value)
    }
  }

  // A changed source sample invalidates the previously analyzed profile.
  if (req.body.reference_style !== undefined && req.body.style_profile === undefined) {
    updates.push('style_profile = ?')
    values.push('')
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    values.push(String(req.params.id))
    db.prepare(`UPDATE stories SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id))
  res.json(story)
})

// Delete story
storyRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id))
  if (!existing) {
    return res.status(404).json({ error: 'Story not found' })
  }
  db.prepare('DELETE FROM stories WHERE id = ?').run(String(req.params.id))
  res.json({ deleted: true })
})

storyRouter.post('/:id/analyze-style', async (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare('SELECT reference_style FROM stories WHERE id = ?').get(String(req.params.id)) as any
  if (!story) return res.status(404).json({ error: 'Story not found', code: 'NOT_FOUND' })
  const referenceText = String(story.reference_style || '').trim()
  if (referenceText.length < 200) {
    return res.status(400).json({ error: '参考文风至少需要 200 个字符才能分析', code: 'REFERENCE_TOO_SHORT' })
  }

  try {
    const { analyzeWritingStyle } = await import('../agents/style-analyzer.js')
    const profile = await analyzeWritingStyle(referenceText)
    db.prepare("UPDATE stories SET style_profile = ?, updated_at = datetime('now') WHERE id = ?")
      .run(profile, String(req.params.id))
    res.json({ profile, sourceLength: referenceText.length, analyzedLength: Math.min(referenceText.length, 12000) })
  } catch (err: any) {
    res.status(500).json({ error: err.message || '风格分析失败', code: 'STYLE_ANALYSIS_FAILED' })
  }
})
