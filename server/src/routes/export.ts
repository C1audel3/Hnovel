import { Router, Request, Response } from 'express'
import { getDatabase } from '../db/index.js'

export const exportRouter = Router({ mergeParams: true })

// encode Chinese/special chars in filename for HTTP header
function safeFilename(title: string, ext: string): string {
  const safe = encodeURIComponent(title)
  return `attachment; filename="${safe}.${ext}"; filename*=UTF-8''${safe}.${ext}`
}

// Export as markdown
exportRouter.get('/:id/export/markdown', (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id)) as any
  if (!story) return res.status(404).json({ error: 'Story not found' })

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC'
  ).all(String(req.params.id)) as any[]

  let md = `# ${story.title}\n\n`
  if (story.synopsis) md += `> ${story.synopsis}\n\n`
  md += `---\n\n`

  for (const ch of chapters) {
    md += `## 第${ch.chapter_number}章 ${ch.title}\n\n`
    if (ch.content) md += ch.content + '\n\n'
    md += `---\n\n`
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(story.title, 'md'))
  res.send(md)
})

// Export as TXT
exportRouter.get('/:id/export/txt', (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id)) as any
  if (!story) return res.status(404).json({ error: 'Story not found' })

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC'
  ).all(String(req.params.id)) as any[]

  let txt = `${story.title}\n\n`
  if (story.synopsis) txt += `${story.synopsis}\n\n`
  txt += `${'='.repeat(50)}\n\n`

  for (const ch of chapters) {
    txt += `第${ch.chapter_number}章 ${ch.title}\n\n`
    if (ch.content) {
      txt += ch.content
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        + '\n\n'
    }
    txt += `${'='.repeat(50)}\n\n`
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(story.title, 'txt'))
  res.send(txt)
})

// Export as HTML
exportRouter.get('/:id/export/html', (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id)) as any
  if (!story) return res.status(404).json({ error: 'Story not found' })

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC'
  ).all(String(req.params.id)) as any[]

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${story.title}</title>
  <style>
    body { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: 'Noto Serif SC', serif; line-height: 1.8; color: #333; background: #fafaf8; }
    h1 { text-align: center; font-size: 2rem; margin-bottom: 0.5rem; }
    .synopsis { text-align: center; color: #666; font-style: italic; margin-bottom: 2rem; }
    h2 { font-size: 1.4rem; margin-top: 2.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    p { text-indent: 2em; margin: 0.5em 0; }
  </style>
</head>
<body>
  <h1>${story.title}</h1>
  <p class="synopsis">${story.synopsis || ''}</p>
`

  for (const ch of chapters) {
    html += `  <h2>第${ch.chapter_number}章 ${ch.title}</h2>\n`
    if (ch.content) {
      for (const p of ch.content.split('\n\n')) {
        if (p.trim()) html += `  <p>${p.trim()}</p>\n`
      }
    }
  }

  html += `</body>\n</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(story.title, 'html'))
  res.send(html)
})

// Export single chapter as markdown
exportRouter.get('/:id/export/markdown/:num', (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id)) as any
  if (!story) return res.status(404).json({ error: 'Story not found' })

  const chapter = db.prepare(
    'SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?'
  ).get(String(req.params.id), String(req.params.num)) as any
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' })

  let md = `# ${story.title}\n\n`
  md += `## 第${chapter.chapter_number}章 ${chapter.title}\n\n`
  md += (chapter.content || '（暂无内容）') + '\n'

  const name = `${story.title}-Ch${chapter.chapter_number}`
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(name, 'md'))
  res.send(md)
})
