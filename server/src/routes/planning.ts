import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import OpenAI from 'openai'
import { getDatabase } from '../db/index.js'
import { arcSchema, foreshadowSchema, outlineSchema, structureSchema, timelineEventSchema, validateBody, worldItemSchema } from '../middleware/validation.js'

export const planningRouter = Router({ mergeParams: true })
const storyId = (req: Request) => String(req.params.id)

let openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.LLM_API_KEY || '',
      baseURL: process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1',
    })
  }
  return openai
}

const MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash'

function findFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }

  return null
}

function parseJsonObject(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const objectText = findFirstJsonObject(cleaned)
  const candidates = [cleaned, objectText].filter((item): item is string => Boolean(item))

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(`AI返回非JSON格式: ${text.slice(0, 500)}`)
}

async function repairJsonObject(rawText: string, schemaHint: string): Promise<any> {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: '你是严格JSON修复器。只能输出一个可被 JSON.parse 解析的 JSON 对象，不要输出Markdown、解释、代码块或前后缀。' },
      {
        role: 'user',
        content: `请把下面内容修复为严格JSON对象。\n\n目标字段：${schemaHint}\n\n原始内容：\n${rawText.slice(0, 8000)}`,
      },
    ],
  })

  const repaired = response.choices[0]?.message?.content || ''
  return parseJsonObject(repaired)
}

async function parseOrRepairJsonObject(rawText: string, schemaHint: string): Promise<any> {
  try {
    return parseJsonObject(rawText)
  } catch {
    return repairJsonObject(rawText, schemaHint)
  }
}

planningRouter.get('/:id/world-items', (req: Request, res: Response) => {
  const rows = getDatabase().prepare(`
    SELECT id, category, name, item_type AS type, summary, description, rules,
      connections, tags, importance, start_chapter AS startChapter,
      end_chapter AS endChapter, status
    FROM world_items WHERE story_id = ? ORDER BY created_at ASC
  `).all(storyId(req))
  res.json(rows)
})

planningRouter.post('/:id/world-items', validateBody(worldItemSchema), (req: Request, res: Response) => {
  const {
    category, name, type, summary, description, rules, connections, tags,
    importance, startChapter, endChapter, status,
  } = req.body
  const id = randomUUID()
  const db = getDatabase()
  db.prepare(`INSERT INTO world_items
    (id, story_id, category, name, item_type, summary, description, rules, connections,
      tags, importance, start_chapter, end_chapter, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, storyId(req), category, name, type || 'other', summary || '', description || '',
      rules || '', connections || '', tags || '', importance || 'medium',
      startChapter || null, endChapter || null, status || 'active')
  const item = db.prepare(`SELECT id, category, name, item_type AS type, summary,
      description, rules, connections, tags, importance, start_chapter AS startChapter,
      end_chapter AS endChapter, status
    FROM world_items WHERE id = ?`).get(id)
  res.status(201).json(item)
})

planningRouter.put('/:id/world-items/:itemId', validateBody(worldItemSchema), (req: Request, res: Response) => {
  const {
    category, name, type, summary, description, rules, connections, tags,
    importance, startChapter, endChapter, status,
  } = req.body
  const db = getDatabase()
  const result = db.prepare(`UPDATE world_items SET
      category = ?, name = ?, item_type = ?, summary = ?, description = ?, rules = ?,
      connections = ?, tags = ?, importance = ?, start_chapter = ?, end_chapter = ?,
      status = ?, updated_at = datetime('now')
    WHERE id = ? AND story_id = ?`)
    .run(category, name, type || 'other', summary || '', description || '', rules || '',
      connections || '', tags || '', importance || 'medium', startChapter || null,
      endChapter || null, status || 'active', String(req.params.itemId), storyId(req))
  if (result.changes === 0) return res.status(404).json({ error: 'World item not found', code: 'NOT_FOUND' })
  const item = db.prepare(`SELECT id, category, name, item_type AS type, summary,
      description, rules, connections, tags, importance, start_chapter AS startChapter,
      end_chapter AS endChapter, status
    FROM world_items WHERE id = ? AND story_id = ?`).get(String(req.params.itemId), storyId(req))
  res.json(item)
})

planningRouter.delete('/:id/world-items/:itemId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM world_items WHERE id = ? AND story_id = ?')
    .run(String(req.params.itemId), storyId(req))
  res.json({ deleted: true })
})

planningRouter.post('/:id/world-items/generate', async (req: Request, res: Response) => {
  try {
    const db = getDatabase()
    const story = db.prepare('SELECT title, genre, synopsis, tone_style FROM stories WHERE id = ?').get(storyId(req)) as any
    if (!story) return res.status(404).json({ error: 'Story not found', code: 'NOT_FOUND' })

    const { category, name, hints } = req.body
    const existing = db.prepare(`SELECT category, name, item_type AS type, summary
      FROM world_items WHERE story_id = ? ORDER BY created_at ASC LIMIT 30`).all(storyId(req))

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      temperature: 0.8,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: '你是专业的小说世界观设定助手。只返回严格JSON对象，不返回Markdown、解释或前后缀。' },
        {
          role: 'user',
          content: `请为小说生成一条世界观设定草稿。

故事标题：${story.title}
类型：${story.genre}
梗概：${story.synopsis || '未填写'}
基调：${story.tone_style || '未填写'}
已有设定：${JSON.stringify(existing)}

目标分类：${category || 'overview'}
名称倾向：${name || '可自行命名'}
补充提示：${hints || '无'}

返回JSON格式：
{
  "category": "overview/locations/systems/factions/artifacts/terms",
  "name": "名称",
  "type": "类型英文，如 era/city/power/government/item/term/other",
  "importance": "low/medium/high",
  "summary": "一句话摘要",
  "description": "详细说明，80-220字",
  "rules": "写作时必须遵守的规则、限制或代价",
  "tags": ["标签1", "标签2", "标签3"]
}

注意：只能输出一个JSON对象，第一字符必须是 {，最后一个字符必须是 }。不要使用Markdown代码块，不要解释。`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content || ''
    const draft = await parseOrRepairJsonObject(raw, 'category,name,type,importance,summary,description,rules,tags')
    res.json({
      category: ['overview', 'locations', 'systems', 'factions', 'artifacts', 'terms'].includes(draft.category) ? draft.category : (category || 'overview'),
      name: String(draft.name || name || ''),
      type: String(draft.type || 'other'),
      importance: ['low', 'medium', 'high'].includes(draft.importance) ? draft.importance : 'medium',
      summary: String(draft.summary || ''),
      description: String(draft.description || ''),
      rules: String(draft.rules || ''),
      tags: Array.isArray(draft.tags) ? draft.tags.map(String).join(', ') : String(draft.tags || ''),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || '世界观生成失败', code: 'WORLD_GENERATION_FAILED' })
  }
})

planningRouter.get('/:id/plot', (req: Request, res: Response) => {
  const db = getDatabase()
  const setting = db.prepare('SELECT structure_model FROM plot_settings WHERE story_id = ?').get(storyId(req)) as any
  const arcs = db.prepare(`SELECT id, name, arc_type AS type, characters, description,
      start_chapter AS startChapter, end_chapter AS endChapter, priority,
      current_phase AS currentPhase, goal, conflict, status
    FROM story_arcs WHERE story_id = ? ORDER BY created_at ASC`).all(storyId(req))
  const events = db.prepare(`SELECT id, chapter, description, COALESCE(arc_id, '') AS arc,
      event_type AS type, importance, characters, occurred, notes
    FROM timeline_events WHERE story_id = ? ORDER BY created_at ASC`).all(storyId(req))
  const foreshadows = db.prepare(`SELECT id, name, description,
      setup_chapter AS setupChapter, payoff_chapter AS payoffChapter,
      COALESCE(arc_id, '') AS arc, status, notes
    FROM foreshadows WHERE story_id = ? ORDER BY created_at ASC`).all(storyId(req))
  res.json({
    structureModel: setting?.structure_model || 'qichengzhuanhe',
    arcs: (arcs as any[]).map(arc => ({ ...arc, startChapter: arc.startChapter || undefined, endChapter: arc.endChapter || undefined })),
    events: (events as any[]).map(event => ({ ...event, occurred: Boolean(event.occurred) })),
    foreshadows,
  })
})

planningRouter.put('/:id/plot/structure', validateBody(structureSchema), (req: Request, res: Response) => {
  getDatabase().prepare(`INSERT INTO plot_settings (story_id, structure_model) VALUES (?, ?)
    ON CONFLICT(story_id) DO UPDATE SET structure_model = excluded.structure_model, updated_at = datetime('now')`)
    .run(storyId(req), req.body.structureModel || 'qichengzhuanhe')
  res.json({ structureModel: req.body.structureModel || 'qichengzhuanhe' })
})

planningRouter.post('/:id/plot/generate', async (req: Request, res: Response) => {
  try {
    const db = getDatabase()
    const story = db.prepare('SELECT title, genre, synopsis, tone_style FROM stories WHERE id = ?').get(storyId(req)) as any
    if (!story) return res.status(404).json({ error: 'Story not found', code: 'NOT_FOUND' })

    const { kind, startChapter, endChapter, hints } = req.body
    const arcs = db.prepare('SELECT name, arc_type AS type, goal, conflict, description FROM story_arcs WHERE story_id = ? ORDER BY created_at ASC LIMIT 20').all(storyId(req))
    const events = db.prepare('SELECT chapter, description, event_type AS type FROM timeline_events WHERE story_id = ? ORDER BY created_at ASC LIMIT 30').all(storyId(req))
    const foreshadows = db.prepare('SELECT name, setup_chapter AS setupChapter, payoff_chapter AS payoffChapter, description FROM foreshadows WHERE story_id = ? ORDER BY created_at ASC LIMIT 20').all(storyId(req))

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      temperature: 0.8,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: '你是专业的小说情节规划助手。只返回严格JSON对象，不返回Markdown、解释或前后缀。' },
        {
          role: 'user',
          content: `请为小说生成一条情节规划草稿。

故事标题：${story.title}
类型：${story.genre}
梗概：${story.synopsis || '未填写'}
基调：${story.tone_style || '未填写'}
已有故事线：${JSON.stringify(arcs)}
已有时间线：${JSON.stringify(events)}
已有伏笔：${JSON.stringify(foreshadows)}

生成类型：${kind || 'arc'}（arc/event/foreshadow）
章节范围：${startChapter || '未指定'}-${endChapter || '未指定'}
补充提示：${hints || '无'}

如果生成类型是arc，返回：
{"kind":"arc","name":"故事线名称","type":"main/sub/hidden/character/romance/growth/faction","status":"planned/active","startChapter":1,"endChapter":10,"goal":"目标","conflict":"冲突","description":"描述"}

如果生成类型是event，返回：
{"kind":"event","chapter":"章节","type":"main/sub/turning/foreshadow/payoff/character","importance":"low/medium/high","occurred":false,"description":"事件描述"}

如果生成类型是foreshadow，返回：
{"kind":"foreshadow","name":"伏笔名称","setupChapter":"埋设章节","payoffChapter":"回收章节","status":"planned/planted","description":"伏笔描述"}

注意：只能输出一个JSON对象，第一字符必须是 {，最后一个字符必须是 }。不要使用Markdown代码块，不要解释。`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content || ''
    const draft = await parseOrRepairJsonObject(raw, 'kind,name,type,status,startChapter,endChapter,goal,conflict,description,chapter,importance,occurred,setupChapter,payoffChapter')
    res.json({ ...draft, kind: draft.kind || kind || 'arc' })
  } catch (err: any) {
    res.status(500).json({ error: err.message || '情节规划生成失败', code: 'PLOT_GENERATION_FAILED' })
  }
})

planningRouter.post('/:id/plot/arcs', validateBody(arcSchema), (req: Request, res: Response) => {
  const id = randomUUID()
  const { name, type, characters, description, startChapter, endChapter, priority, currentPhase, goal, conflict, status } = req.body
  const db = getDatabase()
  db.prepare(`INSERT INTO story_arcs
    (id, story_id, name, arc_type, characters, description, start_chapter, end_chapter, priority, current_phase, goal, conflict, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, storyId(req), name, type || 'main', characters || '', description || '',
      startChapter || null, endChapter || null, priority || 'medium', currentPhase || '',
      goal || '', conflict || '', status || 'active')
  const arc = db.prepare(`SELECT id, name, arc_type AS type, characters, description,
    start_chapter AS startChapter, end_chapter AS endChapter, priority, current_phase AS currentPhase,
    goal, conflict, status FROM story_arcs WHERE id = ?`).get(id)
  res.status(201).json(arc)
})

planningRouter.delete('/:id/plot/arcs/:arcId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM story_arcs WHERE id = ? AND story_id = ?')
    .run(String(req.params.arcId), storyId(req))
  res.json({ deleted: true })
})

planningRouter.post('/:id/plot/events', validateBody(timelineEventSchema), (req: Request, res: Response) => {
  const id = randomUUID()
  const { chapter, description, arc, type, importance, characters, occurred, notes } = req.body
  const db = getDatabase()
  db.prepare(`INSERT INTO timeline_events
    (id, story_id, chapter, description, arc_id, event_type, importance, characters, occurred, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, storyId(req), chapter || '', description, arc || null,
      type || 'main', importance || 'medium', characters || '', occurred ? 1 : 0, notes || '')
  const event = db.prepare(`SELECT id, chapter, description, COALESCE(arc_id, '') AS arc,
    event_type AS type, importance, characters, occurred, notes FROM timeline_events WHERE id = ?`).get(id) as any
  if (event) event.occurred = Boolean(event.occurred)
  res.status(201).json(event)
})

planningRouter.delete('/:id/plot/events/:eventId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM timeline_events WHERE id = ? AND story_id = ?')
    .run(String(req.params.eventId), storyId(req))
  res.json({ deleted: true })
})

planningRouter.post('/:id/plot/foreshadows', validateBody(foreshadowSchema), (req: Request, res: Response) => {
  const id = randomUUID()
  const { name, description, setupChapter, payoffChapter, arc, status, notes } = req.body
  const db = getDatabase()
  db.prepare(`INSERT INTO foreshadows
    (id, story_id, name, description, setup_chapter, payoff_chapter, arc_id, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, storyId(req), name, description || '', setupChapter || '', payoffChapter || '',
      arc || null, status || 'planned', notes || '')
  const item = db.prepare(`SELECT id, name, description, setup_chapter AS setupChapter,
    payoff_chapter AS payoffChapter, COALESCE(arc_id, '') AS arc, status, notes
    FROM foreshadows WHERE id = ?`).get(id)
  res.status(201).json(item)
})

planningRouter.delete('/:id/plot/foreshadows/:foreshadowId', (req: Request, res: Response) => {
  getDatabase().prepare('DELETE FROM foreshadows WHERE id = ? AND story_id = ?')
    .run(String(req.params.foreshadowId), storyId(req))
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
