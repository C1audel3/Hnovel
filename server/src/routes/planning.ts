import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { getDatabase } from '../db/index.js'
import { arcSchema, outlineSchema, structureSchema, timelineEventSchema, validateBody, worldItemSchema } from '../middleware/validation.js'

export const planningRouter = Router({ mergeParams: true })
const storyId = (req: Request) => String(req.params.id)

planningRouter.get('/:id/world-items', (req: Request, res: Response) => {
  const rows = getDatabase().prepare(`
    SELECT id, category, name, item_type AS type, description, status
    FROM world_items WHERE story_id = ? ORDER BY created_at ASC
  `).all(storyId(req))
  res.json(rows)
})

planningRouter.post('/:id/world-items', validateBody(worldItemSchema), (req: Request, res: Response) => {
  const { category, name, type, description } = req.body
  const id = randomUUID()
  const db = getDatabase()
  db.prepare(`INSERT INTO world_items (id, story_id, category, name, item_type, description)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, storyId(req), category, name, type || 'other', description || '')
  const item = db.prepare(`SELECT id, category, name, item_type AS type, description, status
    FROM world_items WHERE id = ?`).get(id)
  res.status(201).json(item)
})

planningRouter.delete('/:id/world-items/:itemId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM world_items WHERE id = ? AND story_id = ?')
    .run(String(req.params.itemId), storyId(req))
  res.json({ deleted: true })
})

planningRouter.get('/:id/plot', (req: Request, res: Response) => {
  const db = getDatabase()
  const setting = db.prepare('SELECT structure_model FROM plot_settings WHERE story_id = ?').get(storyId(req)) as any
  const arcs = db.prepare(`SELECT id, name, arc_type AS type, characters, description, status
    FROM story_arcs WHERE story_id = ? ORDER BY created_at ASC`).all(storyId(req))
  const events = db.prepare(`SELECT id, chapter, description, COALESCE(arc_id, '') AS arc
    FROM timeline_events WHERE story_id = ? ORDER BY created_at ASC`).all(storyId(req))
  res.json({ structureModel: setting?.structure_model || 'qichengzhuanhe', arcs, events })
})

planningRouter.put('/:id/plot/structure', validateBody(structureSchema), (req: Request, res: Response) => {
  getDatabase().prepare(`INSERT INTO plot_settings (story_id, structure_model) VALUES (?, ?)
    ON CONFLICT(story_id) DO UPDATE SET structure_model = excluded.structure_model, updated_at = datetime('now')`)
    .run(storyId(req), req.body.structureModel || 'qichengzhuanhe')
  res.json({ structureModel: req.body.structureModel || 'qichengzhuanhe' })
})

planningRouter.post('/:id/plot/arcs', validateBody(arcSchema), (req: Request, res: Response) => {
  const id = randomUUID()
  const { name, type, characters, description } = req.body
  const db = getDatabase()
  db.prepare(`INSERT INTO story_arcs (id, story_id, name, arc_type, characters, description)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, storyId(req), name, type || 'main', characters || '', description || '')
  const arc = db.prepare(`SELECT id, name, arc_type AS type, characters, description, status FROM story_arcs WHERE id = ?`).get(id)
  res.status(201).json(arc)
})

planningRouter.delete('/:id/plot/arcs/:arcId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM story_arcs WHERE id = ? AND story_id = ?')
    .run(String(req.params.arcId), storyId(req))
  res.json({ deleted: true })
})

planningRouter.post('/:id/plot/events', validateBody(timelineEventSchema), (req: Request, res: Response) => {
  const id = randomUUID()
  const { chapter, description, arc } = req.body
  const db = getDatabase()
  db.prepare(`INSERT INTO timeline_events (id, story_id, chapter, description, arc_id)
    VALUES (?, ?, ?, ?, ?)`)
    .run(id, storyId(req), chapter || '', description, arc || null)
  const event = db.prepare(`SELECT id, chapter, description, COALESCE(arc_id, '') AS arc FROM timeline_events WHERE id = ?`).get(id)
  res.status(201).json(event)
})

planningRouter.delete('/:id/plot/events/:eventId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM timeline_events WHERE id = ? AND story_id = ?')
    .run(String(req.params.eventId), storyId(req))
  res.json({ deleted: true })
})

planningRouter.get('/:id/outline', (req: Request, res: Response) => {
  const rows = getDatabase().prepare(`SELECT chapter_number AS number, title, summary,
    is_nsfw AS nsfw, estimated_words AS estimatedWords FROM outline_chapters
    WHERE story_id = ? ORDER BY chapter_number ASC`).all(storyId(req)) as any[]
  res.json(rows.map(row => ({ ...row, nsfw: Boolean(row.nsfw) })))
})

planningRouter.put('/:id/outline', validateBody(outlineSchema), (req: Request, res: Response) => {
  const db = getDatabase()
  const chapters = Array.isArray(req.body.chapters) ? req.body.chapters : []
  const replace = db.transaction(() => {
    db.prepare('DELETE FROM outline_chapters WHERE story_id = ?').run(storyId(req))
    const insert = db.prepare(`INSERT INTO outline_chapters
      (id, story_id, chapter_number, title, summary, is_nsfw, estimated_words)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    for (const chapter of chapters) {
      insert.run(randomUUID(), storyId(req), chapter.number, chapter.title, chapter.summary || '',
        chapter.nsfw ? 1 : 0, chapter.estimatedWords || 3000)
    }
  })
  replace()
  res.json({ saved: chapters.length })
})
