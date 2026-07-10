import { Router, Request, Response } from 'express'
import { getDatabase } from '../db/index.js'

export const exportRouter = Router({ mergeParams: true })

type StoryRow = { id: string; title: string; synopsis?: string }
type ChapterRow = {
  chapter_number: number
  title: string
  content?: string
}

function safeFilename(title: string, ext: string): string {
  const safe = encodeURIComponent(title.replace(/[\\/:*?"<>|]/g, '_'))
  return `attachment; filename="${safe}.${ext}"; filename*=UTF-8''${safe}.${ext}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
}

function parseRange(req: Request): { from?: number; to?: number } {
  const from = req.query.from ? Number(req.query.from) : undefined
  const to = req.query.to ? Number(req.query.to) : undefined
  return {
    from: Number.isFinite(from) && from! > 0 ? Math.floor(from!) : undefined,
    to: Number.isFinite(to) && to! > 0 ? Math.floor(to!) : undefined,
  }
}

function getStoryAndChapters(req: Request): { story: StoryRow; chapters: ChapterRow[] } | null {
  const db = getDatabase()
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id)) as StoryRow | undefined
  if (!story) return null

  const { from, to } = parseRange(req)
  const conditions = ['story_id = ?']
  const params: Array<string | number> = [String(req.params.id)]
  if (from) {
    conditions.push('chapter_number >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('chapter_number <= ?')
    params.push(to)
  }

  const chapters = db.prepare(`
    SELECT * FROM chapters
    WHERE ${conditions.join(' AND ')}
    ORDER BY chapter_number ASC
  `).all(...params) as ChapterRow[]

  return { story, chapters }
}

function exportBaseName(story: StoryRow, req: Request): string {
  const { from, to } = parseRange(req)
  if (from || to) return `${story.title}-${from || 'start'}-${to || 'end'}`
  return story.title
}

function buildMarkdown(story: StoryRow, chapters: ChapterRow[]): string {
  let md = `# ${story.title}\n\n`
  if (story.synopsis) md += `> ${story.synopsis}\n\n`
  md += `---\n\n`

  for (const ch of chapters) {
    md += `## 第${ch.chapter_number}章 ${ch.title}\n\n`
    md += `${ch.content || '（暂无内容）'}\n\n`
    md += `---\n\n`
  }

  return md
}

function buildTxt(story: StoryRow, chapters: ChapterRow[]): string {
  let txt = `${story.title}\n\n`
  if (story.synopsis) txt += `${story.synopsis}\n\n`
  txt += `${'='.repeat(50)}\n\n`

  for (const ch of chapters) {
    txt += `第${ch.chapter_number}章 ${ch.title}\n\n`
    txt += `${stripMarkdown(ch.content || '（暂无内容）')}\n\n`
    txt += `${'='.repeat(50)}\n\n`
  }

  return txt
}

function buildHtml(story: StoryRow, chapters: ChapterRow[]): string {
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(story.title)}</title>
  <style>
    body { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: "Noto Serif SC", "Songti SC", serif; line-height: 1.8; color: #333; background: #fafaf8; }
    h1 { text-align: center; font-size: 2rem; margin-bottom: 0.5rem; }
    .synopsis { text-align: center; color: #666; font-style: italic; margin-bottom: 2rem; }
    h2 { font-size: 1.4rem; margin-top: 2.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    p { text-indent: 2em; margin: 0.5em 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(story.title)}</h1>
  ${story.synopsis ? `<p class="synopsis">${escapeHtml(story.synopsis)}</p>` : ''}
`

  for (const ch of chapters) {
    html += `  <h2>第${ch.chapter_number}章 ${escapeHtml(ch.title)}</h2>\n`
    const paragraphs = (ch.content || '（暂无内容）').split(/\n{2,}/)
    for (const paragraph of paragraphs) {
      if (paragraph.trim()) html += `  <p>${escapeHtml(paragraph.trim())}</p>\n`
    }
  }

  return `${html}</body>\n</html>`
}

const crcTable = (() => {
  const table: number[] = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function createZip(entries: Array<{ name: string; data: Buffer | string }>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8')
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)

    offset += local.length + name.length + data.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, ...centralParts, end])
}

function chapterXhtml(chapter: ChapterRow): string {
  const paragraphs = (chapter.content || '（暂无内容）')
    .split(/\n{2,}/)
    .filter(part => part.trim())
    .map(part => `<p>${escapeHtml(part.trim())}</p>`)
    .join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head>
  <title>第${chapter.chapter_number}章 ${escapeHtml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles.css" />
</head>
<body>
  <h1>第${chapter.chapter_number}章 ${escapeHtml(chapter.title)}</h1>
  ${paragraphs}
</body>
</html>`
}

function buildEpub(story: StoryRow, chapters: ChapterRow[]): Buffer {
  const uid = `hnovel-${story.id || story.title}`
  const manifestItems = chapters.map(ch =>
    `<item id="chapter-${ch.chapter_number}" href="text/chapter-${ch.chapter_number}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n    ')
  const spineItems = chapters.map(ch => `<itemref idref="chapter-${ch.chapter_number}"/>`).join('\n    ')
  const navItems = chapters.map(ch =>
    `<li><a href="text/chapter-${ch.chapter_number}.xhtml">第${ch.chapter_number}章 ${escapeHtml(ch.title)}</a></li>`
  ).join('\n      ')
  const ncxItems = chapters.map((ch, index) => `
    <navPoint id="navPoint-${ch.chapter_number}" playOrder="${index + 1}">
      <navLabel><text>第${ch.chapter_number}章 ${escapeHtml(ch.title)}</text></navLabel>
      <content src="text/chapter-${ch.chapter_number}.xhtml"/>
    </navPoint>`).join('')

  const entries: Array<{ name: string; data: string }> = [
    { name: 'mimetype', data: 'application/epub+zip' },
    {
      name: 'META-INF/container.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    },
    {
      name: 'OEBPS/content.opf',
      data: `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeHtml(uid)}</dc:identifier>
    <dc:title>${escapeHtml(story.title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`,
    },
    {
      name: 'OEBPS/nav.xhtml',
      data: `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head><title>${escapeHtml(story.title)}</title></head>
<body>
  <nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">
    <h1>${escapeHtml(story.title)}</h1>
    <ol>
      ${navItems}
    </ol>
  </nav>
</body>
</html>`,
    },
    {
      name: 'OEBPS/toc.ncx',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${escapeHtml(uid)}"/></head>
  <docTitle><text>${escapeHtml(story.title)}</text></docTitle>
  <navMap>${ncxItems}
  </navMap>
</ncx>`,
    },
    {
      name: 'OEBPS/styles.css',
      data: `body { font-family: serif; line-height: 1.8; }
h1 { font-size: 1.4em; margin: 1em 0; }
p { text-indent: 2em; margin: 0.6em 0; }`,
    },
    ...chapters.map(ch => ({ name: `OEBPS/text/chapter-${ch.chapter_number}.xhtml`, data: chapterXhtml(ch) })),
  ]

  return createZip(entries)
}

function sendNoChapters(res: Response) {
  return res.status(404).json({ error: 'No chapters found for export' })
}

exportRouter.get('/:id/export/markdown', (req: Request, res: Response) => {
  const data = getStoryAndChapters(req)
  if (!data) return res.status(404).json({ error: 'Story not found' })
  if (data.chapters.length === 0) return sendNoChapters(res)

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(exportBaseName(data.story, req), 'md'))
  res.send(buildMarkdown(data.story, data.chapters))
})

exportRouter.get('/:id/export/txt', (req: Request, res: Response) => {
  const data = getStoryAndChapters(req)
  if (!data) return res.status(404).json({ error: 'Story not found' })
  if (data.chapters.length === 0) return sendNoChapters(res)

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(exportBaseName(data.story, req), 'txt'))
  res.send(buildTxt(data.story, data.chapters))
})

exportRouter.get('/:id/export/html', (req: Request, res: Response) => {
  const data = getStoryAndChapters(req)
  if (!data) return res.status(404).json({ error: 'Story not found' })
  if (data.chapters.length === 0) return sendNoChapters(res)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(exportBaseName(data.story, req), 'html'))
  res.send(buildHtml(data.story, data.chapters))
})

exportRouter.get('/:id/export/epub', (req: Request, res: Response) => {
  const data = getStoryAndChapters(req)
  if (!data) return res.status(404).json({ error: 'Story not found' })
  if (data.chapters.length === 0) return sendNoChapters(res)

  res.setHeader('Content-Type', 'application/epub+zip')
  res.setHeader('Content-Disposition', safeFilename(exportBaseName(data.story, req), 'epub'))
  res.send(buildEpub(data.story, data.chapters))
})

exportRouter.get('/:id/export/markdown/:num', (req: Request, res: Response) => {
  const db = getDatabase()
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(String(req.params.id)) as StoryRow | undefined
  if (!story) return res.status(404).json({ error: 'Story not found' })

  const chapter = db.prepare(
    'SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?'
  ).get(String(req.params.id), String(req.params.num)) as ChapterRow | undefined
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' })

  const name = `${story.title}-Ch${chapter.chapter_number}`
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', safeFilename(name, 'md'))
  res.send(buildMarkdown(story, [chapter]))
})
