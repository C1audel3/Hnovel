import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStory, generateOutline, generateChapter, fetchChapters } from '../lib/api'
import { Icon } from '../components/Icon'
import { useWriteStore } from '../stores/writeStore'
import type { OutlineChapter } from '../lib/types'

export function WritePage() {
  const { id } = useParams<{ id: string }>()
  const { data: story } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!), enabled: !!id })
  const { data: existingChapters } = useQuery({ queryKey: ['chapters', id], queryFn: () => fetchChapters(id!), enabled: !!id })
  const isNsfw = story?.rating === 'nsfw'
  const existingCount = existingChapters?.length || 0
  const nextChapterNum = existingCount + 1

  const {
    phase, setPhase, outlineChapters, setOutlineChapters,
    generatedChapters, addGeneratedChapter, generatedChapter,
    setGeneratedChapter, setConfig, updateChapter, deleteChapter, addChapter, reset,
    chapterCount, minWords, maxWords,
    focusCharacters, chapterPrompts, setChapterPrompt,
  } = useWriteStore()

  const [generating, setGenerating] = useState(false)
  const [writingIndex, setWritingIndex] = useState(-1)
  const [editingChapter, setEditingChapter] = useState(-1)
  const [editForm, setEditForm] = useState({ title: '', summary: '' })

  const handleGenerateOutline = async () => {
    setGenerating(true); setOutlineChapters([])
    try {
      const result = await generateOutline(id!, {
        chapterCount, intensityLevel: 10, explicitLevel: 'graphic',
        focusCharacters: focusCharacters ? focusCharacters.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        additionalInstructions: (() => {
          const entries = Object.entries(chapterPrompts).filter(([, v]) => v.trim())
          if (entries.length === 0) return undefined
          return entries.map(([k, v]) => `第${k}章: ${v}`).join('\n')
        })(),
      })
      setOutlineChapters(result.chapters)
      setPhase('outline')
    } catch (err: any) { alert('大纲生成失败: ' + (err.response?.data?.error || err.message)) }
    finally { setGenerating(false) }
  }

  const handleGenerateChapter = async (chap: OutlineChapter) => {
    setWritingIndex(chap.number); setGenerating(true); setGeneratedChapter(null)
    try {
      const result = await generateChapter(id!, {
        chapterNumber: chap.number, chapterTitle: chap.title,
        chapterSummary: chap.summary,
        intensityLevel: chap.nsfw ? 10 : 2,
        explicitLevel: 'graphic', minWords: Math.max(500, chap.estimatedWords - 500),
        maxWords: chap.estimatedWords + 1000,
        focusCharacters: focusCharacters ? focusCharacters.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })
      setGeneratedChapter(result)
      addGeneratedChapter(chap.number)
    } catch (err: any) { alert('章节生成失败: ' + (err.response?.data?.error || err.message)) }
    finally { setGenerating(false) }
  }

  const toggleNsfw = (chapNum: number) => {
    const chap = outlineChapters.find(c => c.number === chapNum)
    if (chap) updateChapter(chapNum, { nsfw: !chap.nsfw })
  }

  const startEdit = (chap: OutlineChapter) => {
    setEditingChapter(chap.number)
    setEditForm({ title: chap.title, summary: chap.summary })
  }

  const saveEdit = (chapNum: number) => {
    updateChapter(chapNum, { title: editForm.title, summary: editForm.summary })
    setEditingChapter(-1)
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
      <p className="text-text-secondary mb-6">{story?.title}{story ? ' &middot; ' + (story.rating === 'nsfw' ? 'NSFW' : '非NSFW') : ''}</p>

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

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">章节数量</label>
                  <input type="number" value={chapterCount} min={1} max={20}
                    onChange={e => setConfig({ chapterCount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">描写尺度</label>
                  <input type="text" value="详细" disabled
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm text-text-muted cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-text-primary mb-1">最少字数/章</label>
                  <input type="number" value={minWords} onChange={e => setConfig({ minWords: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-text-primary mb-1">最多字数/章</label>
                  <input type="number" value={maxWords} onChange={e => setConfig({ maxWords: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none" /></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">焦点角色 <span className="text-text-muted">(逗号分隔)</span></label>
                <input type="text" value={focusCharacters} placeholder="角色名, 逗号分隔"
                  onChange={e => setConfig({ focusCharacters: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
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
                {outlineChapters.filter(c => c.nsfw).length} NSFW &middot;
                {generatedChapters.size}/{outlineChapters.length} 已生成 &middot;
                {outlineChapters.reduce((s, c) => s + c.estimatedWords, 0).toLocaleString()} 字预估
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => addChapter(isNsfw)}
                className="px-3 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">
                <Icon name="plus" className="w-4 h-4 inline mr-1" />添加章节
              </button>
              <button type="button" onClick={() => { reset(); setPhase('idle') }}
                className="px-3 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">
                <Icon name="refresh" className="w-4 h-4 inline mr-1" />重新生成
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {/* Existing chapters (read-only) */}
              {existingChapters && existingChapters.length > 0 && (
                <>
                  <p className="text-xs text-text-muted font-medium px-1">已写章节</p>
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
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs text-text-muted font-medium px-1 mb-1">新大纲（第{nextChapterNum}-{nextChapterNum + chapterCount - 1}章）</p>
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
                        {chap.nsfw && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-bg text-primary">NSFW</span>}
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
                          {chap.nsfw && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-bg text-primary font-medium">NSFW</span>}
                          {generatedChapters.has(chap.number) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success-bg text-success font-medium">已生成</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {isNsfw && (
                            <button type="button" onClick={() => toggleNsfw(chap.number)}
                              className={`text-[10px] px-1.5 py-0.5 rounded-lg transition-all ${
                                chap.nsfw ? 'bg-primary text-white' : 'bg-bg-dark text-text-muted border border-border'
                              }`}>
                              {chap.nsfw ? 'NSFW' : 'SFW'}
                            </button>
                          )}
                          <button type="button" onClick={() => startEdit(chap)} className="text-text-muted hover:text-primary p-0.5">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => deleteChapter(chap.number)} className="text-text-muted hover:text-danger p-0.5">
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
              <button type="button" onClick={() => addChapter(isNsfw)}
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
