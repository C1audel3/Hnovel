import { Router, Request, Response } from 'express'
import { getDatabase } from '../db/index.js'
import { randomUUID } from 'crypto'

export const chapterRouter = Router({ mergeParams: true })

function getId(req: Request): string { return String(req.params.id) }
function getNum(req: Request): string { return String(req.params.num) }

// List chapters for a story
chapterRouter.get('/:id/chapters', (req: Request, res: Response) => {
  const db = getDatabase()
  const chapters = db.prepare(`
    SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC
  `).all(getId(req))
  res.json(chapters)
})

// Get specific chapter
chapterRouter.get('/:id/chapters/:num', (req: Request, res: Response) => {
  const db = getDatabase()
  const chapter = db.prepare(`
    SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?
  `).get(getId(req), getNum(req))

  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' })
  }
  res.json(chapter)
})

// Create/update chapter
chapterRouter.put('/:id/chapters/:num', (req: Request, res: Response) => {
  const db = getDatabase()
  const existing = db.prepare(`
    SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?
  `).get(getId(req), getNum(req))

  const { title, content, outline, pov_character, location, status, scene_type, explicit_level } = req.body
  const wordCount = content ? content.length : 0

  if (existing) {
    db.prepare(`
      UPDATE chapters SET title = ?, content = ?, outline = ?, pov_character = ?,
        location = ?, status = ?, word_count = ?, scene_type = ?, explicit_level = ?,
        updated_at = datetime('now')
      WHERE story_id = ? AND chapter_number = ?
    `).run(title, content, outline, pov_character, location,
      status || 'draft', wordCount, scene_type || 'normal', explicit_level,
      getId(req), getNum(req))
  } else {
    db.prepare(`
      INSERT INTO chapters (id, story_id, chapter_number, title, content, outline,
        pov_character, location, status, word_count, scene_type, explicit_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), getId(req), getNum(req), title, content, outline,
      pov_character, location, status || 'draft', wordCount, scene_type || 'normal', explicit_level)
  }

  const chapter = db.prepare(`
    SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?
  `).get(getId(req), getNum(req))
  res.json(chapter)
})

// Delete chapter
chapterRouter.delete('/:id/chapters/:num', (req: Request, res: Response) => {
  const db = getDatabase()
  db.prepare('DELETE FROM chapters WHERE story_id = ? AND chapter_number = ?')
    .run(getId(req), getNum(req))
  res.json({ deleted: true })
})

// AI generate chapter outline
chapterRouter.post('/:id/chapters/generate-outline', async (req: Request, res: Response) => {
  const { generateChapterOutline } = await import('../agents/chapter-generator.js')
  try {
    const outline = await generateChapterOutline(getId(req), req.body)
    res.json(outline)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// AI generate full chapter
chapterRouter.post('/:id/chapters/generate', async (req: Request, res: Response) => {
  const { generateChapter } = await import('../agents/chapter-generator.js')
  try {
    const chapter = await generateChapter(getId(req), req.body)
    res.json(chapter)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
