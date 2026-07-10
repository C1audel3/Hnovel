import { Router, Request, Response } from 'express'
import { getDatabase } from '../db/index.js'
import { randomUUID } from 'crypto'
import OpenAI from 'openai'

// Lazy-load OpenAIClient after dotenv loads
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.LLM_API_KEY || '', baseURL: process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1' })
  }
  return _openai
}
const MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash'

const CHAR_GEN_PROMPT = `你是一个专业的小说角色设计师。根据用户提供的基本信息，生成一个简洁、可直接用于长篇小说创作的角色档案。

返回格式必须是严格的JSON：
{
  "name": "角色姓名",
  "gender": "性别或身份表达，可用中文",
  "age": "年龄或年龄段",
  "role": "protagonist/antagonist/love-interest/harem-member/supporting/minor",
  "importance": "low/medium/high",
  "appearance": "外貌与气质，50-120字",
  "personality": "性格描述，50-150字",
  "background": "背景经历，80-180字",
  "current_goal": "当前目标，角色在近期剧情里最想达成什么",
  "voice_style": "说话风格，包含语气、句式或口头禅",
  "writing_notes": "写作注意事项，说明这个角色不能写崩的点",
  "tags": ["标签1", "标签2", "标签3"]
}

要求：
- 角色要有立体感，有优点也有缺点
- 性格描述要具体，不要泛泛而谈
- 背景要服务故事主线，不要写成百科设定
- 标签控制在3-6个
- 所有描述使用中文
- 只返回JSON对象，不要返回Markdown或解释文字`

export const characterRouter = Router({ mergeParams: true })

function getId(req: Request): string { return String(req.params.id) }
function getCid(req: Request): string { return String(req.params.cid) }

// List characters for a story
characterRouter.get('/:id/characters', (req: Request, res: Response) => {
  const db = getDatabase()
  const characters = db.prepare(`
    SELECT * FROM characters WHERE story_id = ? ORDER BY role, name
  `).all(getId(req))
  res.json(characters)
})

// Get character by ID
characterRouter.get('/:id/characters/:cid', (req: Request, res: Response) => {
  const db = getDatabase()
  const character = db.prepare(`
    SELECT * FROM characters WHERE story_id = ? AND id = ?
  `).get(getId(req), getCid(req))

  if (!character) {
    return res.status(404).json({ error: 'Character not found' })
  }

  // Also fetch relationships
  const relationships = db.prepare(`
    SELECT cr.*, c1.name as source_name, c2.name as target_name
    FROM character_relationships cr
    LEFT JOIN characters c1 ON cr.source_id = c1.id
    LEFT JOIN characters c2 ON cr.target_id = c2.id
    WHERE cr.story_id = ? AND (cr.source_id = ? OR cr.target_id = ?)
  `).all(getId(req), getCid(req), getCid(req))

  res.json({ ...character, relationships })
})

// Create character
characterRouter.post('/:id/characters', (req: Request, res: Response) => {
  const db = getDatabase()
  const storyId = getId(req)
  const cid = randomUUID()

  const {
    name, role, status, gender, age, appearance, personality, background,
    sexual_orientation, preferences, body_features, tags, affection_level,
    importance, current_goal, core_conflict, character_arc, voice_style,
    relation_to_plot, secrets, writing_notes,
  } = req.body

  db.prepare(`
    INSERT INTO characters (id, story_id, name, role, status, gender, age,
      appearance, personality, background, sexual_orientation, preferences,
      body_features, importance, current_goal, core_conflict, character_arc,
      voice_style, relation_to_plot, secrets, writing_notes, tags, affection_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, storyId, name, role || 'supporting', status || 'alive', gender, age,
    appearance, personality, background, sexual_orientation,
    JSON.stringify(preferences || []), body_features, importance || 'medium',
    current_goal || '', core_conflict || '', character_arc || '', voice_style || '',
    relation_to_plot || '', secrets || '', writing_notes || '', JSON.stringify(tags || []),
    affection_level || 0)

  // Update story timestamp
  db.prepare("UPDATE stories SET updated_at = datetime('now') WHERE id = ?").run(storyId)

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(cid)
  res.status(201).json(character)
})

// Update character
characterRouter.put('/:id/characters/:cid', (req: Request, res: Response) => {
  const db = getDatabase()
  const storyId = getId(req)
  const cid = getCid(req)

  const existing = db.prepare('SELECT * FROM characters WHERE id = ? AND story_id = ?')
    .get(cid, storyId)
  if (!existing) {
    return res.status(404).json({ error: 'Character not found' })
  }

  const fields = ['name', 'role', 'status', 'gender', 'age', 'appearance',
    'personality', 'background', 'sexual_orientation', 'body_features', 'affection_level',
    'importance', 'current_goal', 'core_conflict', 'character_arc', 'voice_style',
    'relation_to_plot', 'secrets', 'writing_notes']
  const updates: string[] = []
  const values: any[] = []

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(req.body[field])
    }
  }

  // Handle JSON fields
  for (const field of ['preferences', 'tags']) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(JSON.stringify(req.body[field]))
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    values.push(cid, storyId)
    db.prepare(`UPDATE characters SET ${updates.join(', ')} WHERE id = ? AND story_id = ?`).run(...values)
  }

  db.prepare("UPDATE stories SET updated_at = datetime('now') WHERE id = ?").run(storyId)

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(cid)
  res.json(character)
})

// Delete character
characterRouter.delete('/:id/characters/:cid', (req: Request, res: Response) => {
  const db = getDatabase()
  const storyId = getId(req)
  const cid = getCid(req)

  const existing = db.prepare('SELECT * FROM characters WHERE id = ? AND story_id = ?')
    .get(cid, storyId)
  if (!existing) {
    return res.status(404).json({ error: 'Character not found' })
  }

  // Delete relationships first
  db.prepare('DELETE FROM character_relationships WHERE story_id = ? AND (source_id = ? OR target_id = ?)')
    .run(storyId, cid, cid)
  db.prepare('DELETE FROM characters WHERE id = ?').run(cid)
  res.json({ deleted: true })
})

// Get character relationships
characterRouter.get('/:id/characters/:cid/relationships', (req: Request, res: Response) => {
  const db = getDatabase()
  const relationships = db.prepare(`
    SELECT cr.*, c1.name as source_name, c2.name as target_name
    FROM character_relationships cr
    LEFT JOIN characters c1 ON cr.source_id = c1.id
    LEFT JOIN characters c2 ON cr.target_id = c2.id
    WHERE cr.story_id = ? AND (cr.source_id = ? OR cr.target_id = ?)
  `).all(getId(req), getCid(req), getCid(req))
  res.json(relationships)
})

// Add relationship
characterRouter.post('/:id/characters/:cid/relationships', (req: Request, res: Response) => {
  const db = getDatabase()
  const storyId = getId(req)
  const sourceId = getCid(req)
  const {
    target_id, rel_type, intimacy_level, trust_level, conflict_level,
    status, phase, is_public, description, notes,
  } = req.body

  // Validate both characters exist
  const target = db.prepare('SELECT * FROM characters WHERE id = ? AND story_id = ?')
    .get(target_id, storyId)
  if (!target) {
    return res.status(404).json({ error: 'Target character not found' })
  }

  // Check if relationship already exists
  const existing = db.prepare(`
    SELECT * FROM character_relationships
    WHERE story_id = ? AND source_id = ? AND target_id = ? AND rel_type = ?
  `).get(storyId, sourceId, target_id, rel_type)

  if (existing) {
    db.prepare(`
      UPDATE character_relationships SET intimacy_level = ?, trust_level = ?,
        conflict_level = ?, status = ?, phase = ?, is_public = ?, description = ?, notes = ?
      WHERE id = ?
    `).run(intimacy_level || 0, trust_level || 0, conflict_level || 0,
      status || 'active', phase || '', is_public === false ? 0 : 1,
      description || '', notes || '', (existing as any).id)
  } else {
    db.prepare(`
      INSERT INTO character_relationships
        (story_id, source_id, target_id, rel_type, intimacy_level, trust_level,
          conflict_level, status, phase, is_public, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(storyId, sourceId, target_id, rel_type || 'acquaintance',
      intimacy_level || 0, trust_level || 0, conflict_level || 0,
      status || 'active', phase || '', is_public === false ? 0 : 1,
      description || '', notes || '')
  }

  db.prepare("UPDATE stories SET updated_at = datetime('now') WHERE id = ?").run(storyId)
  res.json({ created: true })
})

// Update relationship
characterRouter.put('/:id/relationships/:rid', (req: Request, res: Response) => {
  const db = getDatabase()
  const storyId = getId(req)
  const rid = Number(req.params.rid)
  const {
    rel_type, intimacy_level, trust_level, conflict_level,
    status, phase, is_public, description, notes,
  } = req.body

  const result = db.prepare(`
    UPDATE character_relationships SET rel_type = ?, intimacy_level = ?, trust_level = ?,
      conflict_level = ?, status = ?, phase = ?, is_public = ?, description = ?, notes = ?
    WHERE id = ? AND story_id = ?
  `).run(rel_type || 'acquaintance', intimacy_level || 0, trust_level || 0,
    conflict_level || 0, status || 'active', phase || '', is_public === false ? 0 : 1,
    description || '', notes || '', rid, storyId)

  if (result.changes === 0) return res.status(404).json({ error: 'Relationship not found' })
  db.prepare("UPDATE stories SET updated_at = datetime('now') WHERE id = ?").run(storyId)
  res.json({ updated: true })
})

// Delete relationship
characterRouter.delete('/:id/relationships/:rid', (req: Request, res: Response) => {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM character_relationships WHERE id = ? AND story_id = ?')
    .run(Number(req.params.rid), getId(req))
  if (result.changes === 0) return res.status(404).json({ error: 'Relationship not found' })
  res.json({ deleted: true })
})

// Get relationship graph for story
characterRouter.get('/:id/relationship-graph', (req: Request, res: Response) => {
  const db = getDatabase()
  const storyId = getId(req)

  const nodes = db.prepare('SELECT id, name, role, gender, tags, importance, current_goal FROM characters WHERE story_id = ?')
    .all(storyId)
  const edges = db.prepare(`
    SELECT cr.*, c1.name as source_name, c2.name as target_name
    FROM character_relationships cr
    LEFT JOIN characters c1 ON cr.source_id = c1.id
    LEFT JOIN characters c2 ON cr.target_id = c2.id
    WHERE cr.story_id = ?
  `).all(storyId)

  res.json({ nodes, edges })
})

// AI generate character profile
characterRouter.post('/:id/characters/generate', async (req: Request, res: Response) => {
  try {
    const storyId = getId(req)
    const db = getDatabase()
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(storyId) as any
    if (!story) return res.status(404).json({ error: 'Story not found' })

    const { name, gender, role, hints } = req.body

    const genreLabels: Record<string, string> = {
      school: '校园', wuxia: '武侠', isekai: '异世界', western: '西幻',
    }

    const systemMsg = `你是一个专业的小说角色设计师，擅长创作${genreLabels[story.genre] || story.genre}类型小说的角色。你只回复严格JSON对象，不回复任何解释、Markdown或前后缀。`

    const userMsg = `请为以下角色生成详细档案：

故事类型: ${genreLabels[story.genre] || story.genre}
故事背景: ${story.synopsis || '未指定'}
${name ? `角色姓名: ${name}` : '请自己取名'}
${gender ? `性别: ${gender}` : ''}
${role ? `角色定位倾向: ${role}` : ''}
${hints ? `额外参考: ${hints}` : ''}

${CHAR_GEN_PROMPT}`

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      max_tokens: 3000,
      temperature: 0.9,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
    })

    const raw = response.choices[0]?.message?.content || ''
    if (!raw) throw new Error('AI returned empty response (可能被安全过滤)')

    // Try parsing as raw JSON first, then find JSON in text
    let profile: any
    try {
      profile = JSON.parse(raw)
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error(`AI返回非JSON格式:\n${raw.slice(0, 500)}`)
      profile = JSON.parse(jsonMatch[0])
    }

    res.json({
      name: String(profile.name || name || ''),
      gender: String(profile.gender || gender || ''),
      age: String(profile.age || ''),
      role: String(profile.role || role || 'supporting'),
      importance: ['low', 'medium', 'high'].includes(profile.importance) ? profile.importance : 'medium',
      appearance: String(profile.appearance || ''),
      personality: String(profile.personality || ''),
      background: String(profile.background || ''),
      current_goal: String(profile.current_goal || profile.currentGoal || ''),
      voice_style: String(profile.voice_style || profile.voiceStyle || ''),
      writing_notes: String(profile.writing_notes || profile.writingNotes || ''),
      tags: Array.isArray(profile.tags) ? profile.tags.map(String).slice(0, 8) : [],
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
