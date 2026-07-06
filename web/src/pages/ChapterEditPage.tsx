import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchChapter, saveChapter, generateChapter, fetchStory } from '../lib/api'
import { Icon } from '../components/Icon'

export function ChapterEditPage() {
  const { id, num } = useParams<{ id: string; num: string }>()
  const queryClient = useQueryClient()
  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', id, num],
    queryFn: () => fetchChapter(id!, Number(num)),
    enabled: !!id && !!num,
  })
  const { data: story } = useQuery({
    queryKey: ['story', id],
    queryFn: () => fetchStory(id!),
    enabled: !!id,
  })

  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)

  // AI rewrite state
  const [showRewrite, setShowRewrite] = useState(false)
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [rewriting, setRewriting] = useState(false)
  const [rewriteResult, setRewriteResult] = useState('')

  const saveMutation = useMutation({
    mutationFn: (c: string) => saveChapter(id!, Number(num), {
      title: chapter?.title,
      content: c,
      word_count: c.replace(/\s/g, '').length,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter', id, num] })
      queryClient.invalidateQueries({ queryKey: ['chapters', id] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const displayContent = content || chapter?.content || ''
  const isNsfwChapter = chapter?.scene_type !== 'normal'

  const handleRewrite = async () => {
    if (!rewritePrompt.trim()) return
    setRewriting(true)
    try {
      const result = await generateChapter(id!, {
        chapterNumber: Number(num),
        chapterTitle: chapter?.title,
        minWords: Math.max(500, (chapter?.word_count || 2000) - 500),
        maxWords: (chapter?.word_count || 3000) + 2000,
        additionalInstructions: `【最高优先级指令】请根据以下要求重写本章内容，这些要求优先于任何其他设定：\n\n${rewritePrompt}\n\n【重要】请在重写时严格遵循以上指令，不要忽略任何要求。`,
      })
      setRewriteResult(result.content)
      setContent(result.content)
      setShowRewrite(false)
      setRewritePrompt('')
    } catch (err: any) {
      alert('AI重写失败: ' + (err.response?.data?.error || err.message))
    } finally { setRewriting(false) }
  }

  if (isLoading) return (
    <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}/chapters`} className="hover:text-primary transition-colors">章节</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">第{num}章</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{chapter?.title || `第${num}章`}</h1>
        <div className="flex items-center gap-3 mt-2">
          {chapter && <span className="text-sm text-text-muted">{(content || chapter.content || '').replace(/\s/g, '').length.toLocaleString()} 字</span>}
          {isNsfwChapter && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-bg text-primary">NSFW内容</span>}
          {rewriteResult && <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success">AI已重写</span>}
        </div>
      </div>

      {chapter?.outline && (
        <details className="bg-bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
            <Icon name="clipboard" className="w-4 h-4 inline mr-1.5" />大纲
          </summary>
          <pre className="mt-2 text-xs text-text-muted whitespace-pre-wrap font-sans">{chapter.outline}</pre>
        </details>
      )}

      {/* AI Rewrite Modal */}
      {showRewrite && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 modal-enter">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">AI重写第{num}章</h3>
              <button type="button" onClick={() => setShowRewrite(false)} className="text-text-muted hover:text-text-primary">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              描述你希望如何修改本章。提示词将作为最高优先级指令发送给AI。
            </p>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">重写指令</label>
              <textarea
                value={rewritePrompt}
                onChange={e => setRewritePrompt(e.target.value)}
                placeholder={`告诉AI如何重写，例如：\n- 把打斗场景写得更激烈\n- 加入林婉儿对主角心动的内心独白\n- 删除张三这个角色\n- 结尾改为主角被神秘人跟踪`}
                rows={6}
                autoFocus
                className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={handleRewrite} disabled={!rewritePrompt.trim() || rewriting}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2">
                {rewriting ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> 重写中...</>
                ) : (
                  <><Icon name="sparkle" className="w-4 h-4" /> 开始重写</>
                )}
              </button>
              <button type="button" onClick={() => setShowRewrite(false)}
                className="px-5 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-dark">
          <Icon name="edit" className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Markdown 编辑器</span>
          {rewriteResult && <span className="text-xs text-success ml-auto">已通过AI重写</span>}
        </div>
        <textarea value={displayContent} onChange={e => setContent(e.target.value)}
          className="w-full min-h-[500px] p-6 text-text-primary bg-transparent resize-none focus:outline-none leading-relaxed text-sm font-sans"
          placeholder="在这里编辑章节内容..." />
      </div>

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={() => saveMutation.mutate(displayContent)}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl transition-all text-sm font-medium shadow-sm">
          <Icon name="check" className="w-4 h-4" />
          {saved ? '已保存' : saveMutation.isPending ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={() => setShowRewrite(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-primary/30 text-primary hover:bg-primary-bg rounded-xl transition-all text-sm font-medium">
          <Icon name="sparkle" className="w-4 h-4" />AI重写
        </button>
        {rewriteResult && (
          <button type="button" onClick={() => { setContent(chapter?.content || ''); setRewriteResult('') }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl transition-all text-sm">
            <Icon name="refresh" className="w-4 h-4" />恢复原文
          </button>
        )}
      </div>
    </div>
  )
}
