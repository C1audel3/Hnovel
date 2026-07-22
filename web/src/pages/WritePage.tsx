import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStory, generateOutline, generateChapter, generateWritingPlan, fetchChapters, fetchOutline, getApiErrorDiagnostic, getApiErrorMessage, saveOutline, type ApiErrorDiagnostic } from '../lib/api'
import { Icon } from '../components/Icon'
import { AiErrorPanel } from '../components/AiErrorPanel'
import { useWriteStore } from '../stores/writeStore'
import type { OutlineChapter, WritingPlan } from '../lib/types'

export function WritePage() {
  const { id } = useParams<{ id: string }>()
  const { data: story } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!), enabled: !!id })
  const { data: existingChapters } = useQuery({ queryKey: ['chapters', id], queryFn: () => fetchChapters(id!), enabled: !!id })
  const { data: savedOutline } = useQuery({ queryKey: ['outline', id], queryFn: () => fetchOutline(id!), enabled: !!id })
  const isNsfw = story?.rating === 'nsfw'
  const existingCount = existingChapters?.length || 0

  const {
    switchStory,
    phase, setPhase, outlineChapters, setOutlineChapters,
    generatedChapters, addGeneratedChapter, generatedChapter,
    setGeneratedChapter, setConfig, updateChapter, deleteChapter,
    chapterCount, minWords, maxWords,
    focusCharacters, outlineDirection, chapterPrompts, setChapterPrompt,
  } = useWriteStore()

  const occupiedChapterNumbers = new Set<number>()
  for (const chapter of existingChapters || []) occupiedChapterNumbers.add(chapter.chapter_number)
  for (const chapter of outlineChapters) occupiedChapterNumbers.add(chapter.number)
  let nextChapterNum = 1
  while (occupiedChapterNumbers.has(nextChapterNum)) nextChapterNum++
  const maxWrittenChapter = existingChapters?.reduce((max, chapter) => Math.max(max, chapter.chapter_number || 0), 0) || 0
  const maxSavedOutlineChapter = outlineChapters.reduce((max, chapter) => Math.max(max, chapter.number || 0), 0)
  const outlineActionButtonClass = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary border border-primary/50 text-white hover:bg-primary-dark hover:border-primary-dark rounded-xl text-sm font-medium transition-all shadow-sm shadow-primary/20 whitespace-nowrap'

  const [generating, setGenerating] = useState(false)
  const [writingIndex, setWritingIndex] = useState(-1)
  const [editingChapter, setEditingChapter] = useState(-1)
  const [editForm, setEditForm] = useState({ title: '', summary: '' })
  const [aiError, setAiError] = useState<ApiErrorDiagnostic | null>(null)
  const [showExistingChapters, setShowExistingChapters] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [writingPlan, setWritingPlan] = useState<WritingPlan | null>(null)
  const wordStepperButtonClass = 'px-3 bg-primary text-white hover:bg-primary-dark font-semibold'

  useEffect(() => {
    if (!id) return
    switchStory(id)
    setGenerating(false)
    setWritingIndex(-1)
    setEditingChapter(-1)
    setAiError(null)
    setShowExistingChapters(false)
    setPlanning(false)
    setWritingPlan(null)
  }, [id, switchStory])

  useEffect(() => {
    if (!id || !savedOutline || useWriteStore.getState().activeStoryId !== id) return
    setOutlineChapters(savedOutline)
    for (const chapter of existingChapters || []) addGeneratedChapter(chapter.chapter_number)
    setPhase(savedOutline.length > 0 ? 'outline' : 'idle')
  }, [id, savedOutline, existingChapters, setOutlineChapters, addGeneratedChapter, setPhase])

  const normalizeOutlineForSave = (chapters: OutlineChapter[]) => chapters.map(chapter => ({
    ...chapter,
    number: Number(chapter.number),
    title: chapter.title || `第${chapter.number}章`,
    summary: chapter.summary || '（暂无概要）',
    nsfw: Boolean(chapter.nsfw),
    estimatedWords: Number.isFinite(Number(chapter.estimatedWords)) && Number(chapter.estimatedWords) >= 100
      ? Math.round(Number(chapter.estimatedWords))
      : 3000,
  }))

  const persistOutline = (chapters: OutlineChapter[]) => saveOutline(id!, normalizeOutlineForSave(chapters))
  const saveOutlineChanges = (chapters: OutlineChapter[]) => {
    void persistOutline(chapters).catch(error => alert('保存大纲失败: ' + getApiErrorMessage(error)))
  }

  const mergeOutlineChapters = (base: OutlineChapter[], incoming: OutlineChapter[]) => {
    const merged = new Map<number, OutlineChapter>()
    for (const chapter of base) merged.set(chapter.number, chapter)
    for (const chapter of incoming) merged.set(chapter.number, chapter)
    return normalizeOutlineForSave([...merged.values()]).sort((a, b) => a.number - b.number)
  }

  const handleGenerateOutline = async () => {
    const requestStoryId = id!
    setAiError(null)
    setGenerating(true)
    try {
      const result = await generateOutline(requestStoryId, {
        chapterCount, chapterNumber: nextChapterNum, minWords, maxWords, intensityLevel: 10, explicitLevel: 'graphic',
        outlineDirection: outlineDirection.trim() || undefined,
        focusCharacters: focusCharacters ? focusCharacters.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        additionalInstructions: (() => {
          const entries = Object.entries(chapterPrompts).filter(([, v]) => v.trim())
          if (entries.length === 0) return undefined
          return entries.map(([k, v]) => `第${k}章: ${v}`).join('\n')
        })(),
      })
      const nextOutline = mergeOutlineChapters(useWriteStore.getState().outlineChapters, result.chapters)
      try {
        await saveOutline(requestStoryId, normalizeOutlineForSave(nextOutline))
      } catch (error) {
        alert('大纲已生成，但保存失败: ' + getApiErrorMessage(error))
        return
      }
      if (useWriteStore.getState().activeStoryId !== requestStoryId) return
      setOutlineChapters(nextOutline)
      setPhase('outline')
    } catch (error) {
      if (useWriteStore.getState().activeStoryId === requestStoryId) {
        setAiError(getApiErrorDiagnostic(error, 'AI 大纲生成失败'))
      }
    } finally {
      if (useWriteStore.getState().activeStoryId === requestStoryId) setGenerating(false)
    }
  }

  const handleGenerateChapter = async (chap: OutlineChapter) => {
    const requestStoryId = id!
    setAiError(null)
    setWritingIndex(chap.number); setGenerating(true); setGeneratedChapter(null)
    try {
      const result = await generateChapter(requestStoryId, {
        chapterNumber: chap.number, chapterTitle: chap.title,
        chapterSummary: chap.summary,
        intensityLevel: chap.nsfw ? 10 : 2,
        explicitLevel: 'graphic', minWords: Math.max(500, chap.estimatedWords - 500),
        maxWords: chap.estimatedWords + 1000,
        focusCharacters: focusCharacters ? focusCharacters.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })
      if (useWriteStore.getState().activeStoryId === requestStoryId) {
        setGeneratedChapter(result)
        addGeneratedChapter(chap.number)
      }
    } catch (error) {
      if (useWriteStore.getState().activeStoryId === requestStoryId) {
        setAiError(getApiErrorDiagnostic(error, `第${chap.number}章生成失败`))
      }
    } finally {
      if (useWriteStore.getState().activeStoryId === requestStoryId) setGenerating(false)
    }
  }

  const toggleNsfw = (chapNum: number) => {
    const chap = outlineChapters.find(c => c.number === chapNum)
    if (chap) {
      const next = outlineChapters.map(c => c.number === chapNum ? { ...c, nsfw: !c.nsfw } : c)
      updateChapter(chapNum, { nsfw: !chap.nsfw })
      saveOutlineChanges(next)
    }
  }

  const startEdit = (chap: OutlineChapter) => {
    setEditingChapter(chap.number)
    setEditForm({ title: chap.title, summary: chap.summary })
  }

  const saveEdit = (chapNum: number) => {
    const updates = { title: editForm.title, summary: editForm.summary }
    updateChapter(chapNum, updates)
    saveOutlineChanges(outlineChapters.map(c => c.number === chapNum ? { ...c, ...updates } : c))
    setEditingChapter(-1)
  }

  const removeOutlineChapter = (chapNum: number) => {
    const next = outlineChapters.filter(c => c.number !== chapNum)
    deleteChapter(chapNum)
    saveOutlineChanges(next)
  }

  const appendOutlineChapter = () => {
    const maxNum = Math.max(maxWrittenChapter, maxSavedOutlineChapter)
    const estimatedWords = Math.round((minWords + maxWords) / 2)
    const next = [...outlineChapters, { number: maxNum + 1, title: '新章节', summary: '在此编辑章节概要...', nsfw: isNsfw, estimatedWords }]
    setOutlineChapters(next)
    saveOutlineChanges(next)
  }

  const adjustWordSetting = (field: 'minWords' | 'maxWords', delta: number) => {
    const current = field === 'minWords' ? minWords : maxWords
    setConfig({ [field]: Math.max(100, Number(current || 0) + delta) })
  }

  const clearOutline = async () => {
    setPhase('idle')
  }

  const clearUnwrittenOutline = () => {
    const written = new Set((existingChapters || []).map(chapter => chapter.chapter_number))
    const next = outlineChapters.filter(chapter => written.has(chapter.number))
    if (!confirm(`确认清空 ${outlineChapters.length - next.length} 条未写大纲？`)) return
    setOutlineChapters(next)
    saveOutlineChanges(next)
  }

  const clearOutlineRange = () => {
    const input = prompt('输入要清空的大纲范围，例如 6-12 或 8')
    if (!input) return
    const trimmed = input.trim()
    const match = trimmed.match(/^(\d+)(?:\s*[-~]\s*(\d+))?$/)
    if (!match) {
      alert('范围格式不正确，请输入例如 6-12 或 8')
      return
    }
    const from = Number(match[1])
    const to = Number(match[2] || match[1])
    const min = Math.min(from, to)
    const max = Math.max(from, to)
    const next = outlineChapters.filter(chapter => chapter.number < min || chapter.number > max)
    const removed = outlineChapters.length - next.length
    if (removed === 0) {
      alert(`没有找到第 ${min}-${max} 章范围内的大纲`)
      return
    }
    if (!confirm(`确认清空第 ${min}-${max} 章范围内的 ${removed} 条大纲？`)) return
    setOutlineChapters(next)
    saveOutlineChanges(next)
  }

  const formatWritingPlan = (plan: WritingPlan) => [
    `写作计划：${plan.overview}`,
    '',
    `当前状态：${plan.currentStatus}`,
    '',
    '章节计划：',
    ...plan.chapterPlans.map(chapter => [
      `第${chapter.number}章：${chapter.goal}`,
      chapter.keyEvents.length > 0 ? `关键事件：${chapter.keyEvents.join('；')}` : '',
      chapter.characterFocus.length > 0 ? `角色推进：${chapter.characterFocus.join('；')}` : '',
      chapter.notes ? `提醒：${chapter.notes}` : '',
    ].filter(Boolean).join('\n')),
    '',
    plan.suggestions.length > 0 ? `建议：\n${plan.suggestions.map(item => `- ${item}`).join('\n')}` : '',
    plan.risks.length > 0 ? `风险：\n${plan.risks.map(item => `- ${item}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')

  const handleGenerateWritingPlan = async () => {
    const requestStoryId = id!
    setAiError(null)
    setPlanning(true)
    try {
      const plan = await generateWritingPlan(requestStoryId, {
        chapterStart: nextChapterNum,
        chapterCount: Math.min(chapterCount || 5, 12),
        focus: outlineDirection.trim() || undefined,
      })
      if (useWriteStore.getState().activeStoryId === requestStoryId) setWritingPlan(plan)
    } catch (error) {
      if (useWriteStore.getState().activeStoryId === requestStoryId) {
        setAiError(getApiErrorDiagnostic(error, 'AI 写作计划生成失败'))
      }
    } finally {
      if (useWriteStore.getState().activeStoryId === requestStoryId) setPlanning(false)
    }
  }

  const copyWritingPlan = async () => {
    if (!writingPlan) return
    try {
      await navigator.clipboard.writeText(formatWritingPlan(writingPlan))
    } catch {
      alert('复制失败，请手动选择文本复制')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">AI写作</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">AI写作</h1>
      <p className="text-text-secondary mb-6">{story?.title}{story ? ' &middot; ' + (story.rating === 'nsfw' ? '成人向' : '一般向') : ''}</p>
      <AiErrorPanel diagnostic={aiError} onClose={() => setAiError(null)} />

      <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold mb-1">
              <Icon name="compass" className="w-4 h-4 inline mr-2 text-primary" />
              AI 写作计划
            </h2>
            <p className="text-xs text-text-muted">
              根据现有资料生成一份给你看的后续写作建议；不会保存，也不会参与后续大纲或正文生成。
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {writingPlan && (
              <button type="button" onClick={() => void copyWritingPlan()}
                className="px-3 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-xs transition-all">
                复制
              </button>
            )}
            <button type="button" onClick={() => void handleGenerateWritingPlan()} disabled={planning || generating}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5">
              {planning ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> 规划中...</>
                : <><Icon name="sparkle" className="w-3.5 h-3.5" /> 生成计划</>}
            </button>
          </div>
        </div>

        {writingPlan && (
          <div className="mt-4 space-y-4">
            <div className="bg-bg-dark border border-border rounded-xl p-4">
              <p className="text-sm text-text-primary">{writingPlan.overview}</p>
              <p className="text-xs text-text-muted mt-2">{writingPlan.currentStatus}</p>
            </div>

            {writingPlan.chapterPlans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {writingPlan.chapterPlans.map(chapter => (
                  <div key={chapter.number} className="bg-bg-dark border border-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded-lg">Ch.{chapter.number}</span>
                      <span className="text-xs font-medium text-text-secondary">写作目标</span>
                    </div>
                    <p className="text-sm text-text-primary mb-2">{chapter.goal}</p>
                    {chapter.keyEvents.length > 0 && (
                      <p className="text-xs text-text-muted mb-1">事件：{chapter.keyEvents.join('；')}</p>
                    )}
                    {chapter.characterFocus.length > 0 && (
                      <p className="text-xs text-text-muted mb-1">角色：{chapter.characterFocus.join('；')}</p>
                    )}
                    {chapter.notes && <p className="text-xs text-text-muted">提醒：{chapter.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {(writingPlan.suggestions.length > 0 || writingPlan.risks.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {writingPlan.suggestions.length > 0 && (
                  <div className="bg-bg-dark border border-border rounded-xl p-3">
                    <p className="text-xs font-medium text-text-secondary mb-2">建议</p>
                    <ul className="space-y-1 text-xs text-text-muted">
                      {writingPlan.suggestions.map((item, index) => <li key={index}>- {item}</li>)}
                    </ul>
                  </div>
                )}
                {writingPlan.risks.length > 0 && (
                  <div className="bg-bg-dark border border-border rounded-xl p-3">
                    <p className="text-xs font-medium text-text-secondary mb-2">风险提醒</p>
                    <ul className="space-y-1 text-xs text-text-muted">
                      {writingPlan.risks.map((item, index) => <li key={index}>- {item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div className="max-w-xl mx-auto">
          <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-1">
              <Icon name="clipboard" className="w-5 h-5 inline mr-2 text-primary" />
              生成大纲
            </h2>
            <p className="text-sm text-text-muted mb-5">
              {existingCount > 0
                ? `已有 ${existingCount} 章，AI 将从第 ${nextChapterNum} 章开始生成 ${chapterCount} 章大纲`
                : `AI 将生成 ${chapterCount} 章大纲`}
            </p>

            {outlineChapters.length > 0 && (
              <div className="mb-5 bg-bg-dark border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-text-secondary">已有大纲上下文（生成后续章节时会保留并参考）</p>
                  <span className="text-xs text-text-muted">{outlineChapters.length} 章</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {outlineChapters.map(chap => (
                    <div key={chap.number} className="border border-border/70 rounded-lg p-2 bg-bg-card/60">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-text-muted">Ch.{chap.number}</span>
                        <span className="text-xs text-text-secondary truncate">{chap.title}</span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">{chap.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">章节数量</label>
                  <input type="number" value={chapterCount} min={1} max={20}
                    onChange={e => setConfig({ chapterCount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">细节程度</label>
                  <input type="text" value="详细" disabled
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm text-text-muted cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-text-primary mb-1">最少字数/章</label>
                  <div className="flex overflow-hidden bg-bg-dark border border-border rounded-xl focus-within:border-primary">
                    <button type="button" onClick={() => adjustWordSetting('minWords', -1000)}
                      className={`${wordStepperButtonClass} border-r border-primary-dark/20`}>-</button>
                    <input type="number" value={minWords} min={100} step={1000} onChange={e => setConfig({ minWords: Number(e.target.value) })}
                      className="number-no-spin w-full px-3 py-2.5 bg-transparent text-sm text-center focus:outline-none" />
                    <button type="button" onClick={() => adjustWordSetting('minWords', 1000)}
                      className={`${wordStepperButtonClass} border-l border-primary-dark/20`}>+</button>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-text-primary mb-1">最多字数/章</label>
                  <div className="flex overflow-hidden bg-bg-dark border border-border rounded-xl focus-within:border-primary">
                    <button type="button" onClick={() => adjustWordSetting('maxWords', -1000)}
                      className={`${wordStepperButtonClass} border-r border-primary-dark/20`}>-</button>
                    <input type="number" value={maxWords} min={100} step={1000} onChange={e => setConfig({ maxWords: Number(e.target.value) })}
                      className="number-no-spin w-full px-3 py-2.5 bg-transparent text-sm text-center focus:outline-none" />
                    <button type="button" onClick={() => adjustWordSetting('maxWords', 1000)}
                      className={`${wordStepperButtonClass} border-l border-primary-dark/20`}>+</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">焦点角色 <span className="text-text-muted">(逗号分隔)</span></label>
                <input type="text" value={focusCharacters} placeholder="角色名, 逗号分隔"
                  onChange={e => setConfig({ focusCharacters: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  本批章节主体方向 <span className="text-text-muted">(整体目标)</span>
                </label>
                <textarea value={outlineDirection}
                  onChange={e => setConfig({ outlineDirection: e.target.value })}
                  rows={4}
                  placeholder="例如：这五章主要完成主角加入宗门、与核心女主建立初步信任，并在最后发现宗门内部的阴谋线索。"
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted" />
                <p className="text-xs text-text-muted mt-1">AI 会让本批所有章节围绕这个方向推进，并在最后一章形成阶段性落点。</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-2">
                  逐章内容提示 <span className="text-text-muted">(可选，空的内容AI将自由生成)</span>
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {existingCount > 0 && (
                    <p className="text-xs text-text-muted mb-1">已有 {existingCount} 章，新大纲从第 {nextChapterNum} 章开始</p>
                  )}
                  {Array.from({ length: chapterCount }, (_, i) => nextChapterNum + i).map(num => (
                    <div key={num} className="flex gap-2 items-start">
                      <span className="text-xs font-mono text-text-muted bg-bg-card px-2 py-1.5 rounded-lg border border-border w-14 text-center flex-shrink-0 mt-0.5">
                        Ch.{num}
                      </span>
                      <input
                        type="text"
                        value={chapterPrompts[num] || ''}
                        onChange={e => setChapterPrompt(num, e.target.value)}
                        placeholder={`第${num}章的内容提示（可留空）`}
                        className="flex-1 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none placeholder:text-text-muted"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="button" onClick={handleGenerateOutline} disabled={generating}
              className="w-full mt-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2">
              {generating ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> 生成大纲中...</>
                : <><Icon name="sparkle" className="w-4 h-4" /> 生成大纲</>}
            </button>
          </div>
        </div>
      )}

      {phase === 'outline' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">大纲预览</h2>
              <p className="text-sm text-text-muted">
                {outlineChapters.length} 章 &middot;
                {outlineChapters.filter(c => c.nsfw).length} 重点场景 &middot;
                {generatedChapters.size}/{outlineChapters.length} 已生成 &middot;
                {outlineChapters.reduce((s, c) => s + c.estimatedWords, 0).toLocaleString()} 字预估
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={appendOutlineChapter}
                className={outlineActionButtonClass}>
                <Icon name="plus" className="w-4 h-4" />添加章节
              </button>
              <button type="button" onClick={() => void clearOutline()}
                className={outlineActionButtonClass}>
                <Icon name="refresh" className="w-4 h-4" />继续生成
              </button>
              <button type="button" onClick={clearOutlineRange}
                className={outlineActionButtonClass}>
                清空范围
              </button>
              <button type="button" onClick={clearUnwrittenOutline}
                className={outlineActionButtonClass}>
                清空未写
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {/* Existing chapters (read-only) */}
              {existingChapters && existingChapters.length > 0 && (
                <>
                  <button type="button" onClick={() => setShowExistingChapters(value => !value)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-bg-dark border border-border rounded-xl text-xs text-text-secondary hover:border-primary/30 hover:text-primary transition-all">
                    <span className="font-medium">已写章节 · {existingChapters.length} 章</span>
                    <span className="flex items-center gap-1 text-text-muted">
                      {showExistingChapters ? '收起' : '展开'}
                      <Icon name="arrowRight" className={`w-3 h-3 transition-transform ${showExistingChapters ? 'rotate-90' : ''}`} />
                    </span>
                  </button>
                  {showExistingChapters && (
                    <div className="space-y-3">
                      {existingChapters.map(ch => (
                        <div key={ch.id} className="bg-bg-dark border border-border rounded-xl p-3 opacity-70">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded-lg">Ch.{ch.chapter_number}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success-bg text-success">已写</span>
                          </div>
                          <h3 className="font-medium text-sm text-text-secondary">{ch.title}</h3>
                          <p className="text-xs text-text-muted mt-0.5">{ch.word_count.toLocaleString()} 字</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs text-text-muted font-medium px-1 mb-1">
                      {showExistingChapters ? '新大纲' : '大纲列表'}
                      （第{nextChapterNum}-{nextChapterNum + chapterCount - 1}章）
                    </p>
                  </div>
                </>
              )}
              {outlineChapters.map((chap) => (
                <div key={chap.number}
                  className={`bg-bg-card border rounded-xl p-4 transition-all shadow-sm ${
                    chap.nsfw ? 'border-primary/50 ring-1 ring-primary/10' : 'border-border'
                  }`}>
                  {editingChapter === chap.number ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-muted">Ch.{chap.number}</span>
                        {chap.nsfw && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-bg text-primary">重点</span>}
                      </div>
                      <input type="text" value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-1.5 bg-bg-dark border border-border rounded-lg text-sm font-medium focus:border-primary focus:outline-none" />
                      <textarea value={editForm.summary}
                        onChange={e => setEditForm({ ...editForm, summary: e.target.value })} rows={3}
                        className="w-full px-3 py-1.5 bg-bg-dark border border-border rounded-lg text-xs focus:border-primary focus:outline-none resize-none" />
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => saveEdit(chap.number)}
                          className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-medium">保存</button>
                        <button type="button" onClick={() => setEditingChapter(-1)}
                          className="px-2 py-1.5 border border-border text-text-secondary rounded-lg text-xs">取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-muted bg-bg-dark px-2 py-0.5 rounded-lg">Ch.{chap.number}</span>
                          {chap.nsfw && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-bg text-primary font-medium">重点</span>}
                          {generatedChapters.has(chap.number) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success-bg text-success font-medium">已生成</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {isNsfw && (
                            <button type="button" onClick={() => toggleNsfw(chap.number)}
                              className={`text-[10px] px-1.5 py-0.5 rounded-lg transition-all ${
                                chap.nsfw ? 'bg-primary text-white' : 'bg-bg-dark text-text-muted border border-border'
                              }`}>
                              {chap.nsfw ? '重点' : '普通'}
                            </button>
                          )}
                          <button type="button" onClick={() => startEdit(chap)} className="text-text-muted hover:text-primary p-0.5">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => removeOutlineChapter(chap.number)} className="text-text-muted hover:text-danger p-0.5">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-medium text-sm mb-1">{chap.title}</h3>
                      <p className="text-xs text-text-muted line-clamp-3 mb-3">{chap.summary}</p>
                      <p className="text-xs text-text-muted mb-3">{chap.estimatedWords.toLocaleString()} 字预估</p>
                      <button type="button" onClick={() => handleGenerateChapter(chap)}
                        disabled={generating && writingIndex === chap.number}
                        className="w-full py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5">
                        {generating && writingIndex === chap.number ? (
                          <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> 生成中...</>
                        ) : (
                          <><Icon name="sparkle" className="w-3.5 h-3.5" /> 生成本章</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button type="button" onClick={appendOutlineChapter}
                className="w-full py-2.5 border border-dashed border-border hover:border-primary/30 text-text-muted hover:text-primary rounded-xl text-sm transition-all">
                <Icon name="plus" className="w-4 h-4 inline mr-1" />添加章节
              </button>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[500px] sticky top-6">
                {generating && writingIndex > 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-text-secondary font-medium">正在生成第{writingIndex}章...</p>
                      <p className="text-xs text-text-muted mt-1">约需30-60秒</p>
                    </div>
                  </div>
                ) : generatedChapter ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div>
                        <button type="button" onClick={() => setGeneratedChapter(null)}
                          className="text-xs text-primary hover:text-primary-dark font-medium mb-1 flex items-center gap-1">
                          <Icon name="arrowRight" className="w-3 h-3 rotate-180" />返回大纲
                        </button>
                        <h2 className="text-xl font-bold text-text-primary">第{generatedChapter.chapterNumber}章 {generatedChapter.title}</h2>
                        <p className="text-xs text-text-muted mt-0.5">{generatedChapter.wordCount.toLocaleString()} 字</p>
                      </div>
                      <Link to={`/story/${id}/chapters/${generatedChapter.chapterNumber}`}
                        className="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium shadow-sm flex items-center gap-1">
                        <Icon name="edit" className="w-3.5 h-3.5" />编辑
                      </Link>
                    </div>
                    {generatedChapter.outline && (
                      <details className="bg-bg-dark rounded-xl p-4 border border-border">
                        <summary className="cursor-pointer text-sm font-medium text-text-secondary">
                          <Icon name="clipboard" className="w-4 h-4 inline mr-1.5" />本章大纲
                        </summary>
                        <pre className="mt-2 text-xs text-text-muted whitespace-pre-wrap font-sans">{generatedChapter.outline}</pre>
                      </details>
                    )}
                    <div>
                      {generatedChapter.content.split('\n\n').map((para, i) => (
                        <p key={i} className="text-text-primary leading-relaxed mb-4">{para}</p>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-border">
                      <button type="button" onClick={() => setGeneratedChapter(null)}
                        className="px-4 py-2 bg-bg-dark border border-border hover:bg-bg-card-hover text-text-secondary rounded-xl text-sm transition-all">
                        返回大纲列表
                      </button>
                      <Link to={`/story/${id}/chapters/${generatedChapter.chapterNumber}`}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium shadow-sm flex items-center gap-1">
                        <Icon name="edit" className="w-4 h-4" />去编辑器修改
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20 text-center">
                    <div>
                      <Icon name="file" className="w-12 h-12 mx-auto mb-4 text-text-muted" />
                      <p className="text-text-secondary font-medium mb-1">大纲就绪</p>
                      <p className="text-text-muted text-sm">
                        点击左侧章节"生成本章"开始写作<br />或编辑大纲后再生成
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
