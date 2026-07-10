import { useParams, Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteChapter, fetchChapters, getApiErrorMessage } from '../lib/api'
import { Icon } from '../components/Icon'

export function ChaptersPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const { data: chapters, isLoading } = useQuery({
    queryKey: ['chapters', id], queryFn: () => fetchChapters(id!), enabled: !!id,
  })
  const deleteMutation = useMutation({
    mutationFn: (num: number) => deleteChapter(id!, num),
    onSuccess: (_data, num) => {
      queryClient.removeQueries({ queryKey: ['chapter', id, String(num)] })
      queryClient.invalidateQueries({ queryKey: ['chapters', id] })
      queryClient.invalidateQueries({ queryKey: ['story', id] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
    onError: error => alert('删除章节失败: ' + getApiErrorMessage(error)),
  })

  const handleDelete = (num: number, title: string) => {
    if (confirm(`确认删除第${num}章「${title}」？此操作无法撤销。`)) {
      deleteMutation.mutate(num)
    }
  }
  const exportQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (exportFrom.trim()) params.set('from', exportFrom.trim())
    if (exportTo.trim()) params.set('to', exportTo.trim())
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [exportFrom, exportTo])

  const exportUrl = (format: 'markdown' | 'txt' | 'html' | 'epub') =>
    `/api/stories/${id}/export/${format}${exportQuery}`

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">章节列表</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">章节列表</h1>
          <p className="text-text-secondary mt-1">
            {chapters?.length ? `${chapters.length} 章 &middot; ${chapters.reduce((s, c) => s + c.word_count, 0).toLocaleString()} 字` : '暂无章节'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/story/${id}/write`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-sm">
            <Icon name="plus" className="w-4 h-4" /> 写新章节
          </Link>
        </div>
      </div>

      {chapters && chapters.length > 0 && (
        <div className="bg-bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-semibold mb-1">导出章节</h2>
              <p className="text-xs text-text-muted">留空表示导出全部章节；填写范围可导出指定章节，例如 1 到 20。</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={exportFrom} placeholder="起始章"
                onChange={e => setExportFrom(e.target.value)}
                className="w-24 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
              <span className="text-text-muted">至</span>
              <input type="number" min={1} value={exportTo} placeholder="结束章"
                onChange={e => setExportTo(e.target.value)}
                className="w-24 px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { format: 'txt', label: 'TXT' },
                { format: 'markdown', label: 'Markdown' },
                { format: 'html', label: 'HTML' },
                { format: 'epub', label: 'EPUB' },
              ].map(item => (
                <a key={item.format} href={exportUrl(item.format as 'markdown' | 'txt' | 'html' | 'epub')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-lg transition-all text-sm">
                  <Icon name="file" className="w-4 h-4" /> {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
      ) : !chapters?.length ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Icon name="file" className="w-12 h-12 mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary font-medium mb-2">还没有章节</p>
          <Link to={`/story/${id}/write`} className="text-primary hover:text-primary-dark text-sm font-medium">使用AI开始写第一章</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map(ch => (
            <div key={ch.id}
              className="bg-bg-card border border-border hover:border-primary/20 rounded-xl p-4 transition-all shadow-sm hover:shadow-md flex items-center justify-between group">
              <Link to={`/story/${id}/chapters/${ch.chapter_number}`} className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-mono text-text-muted bg-bg-dark px-3 py-1.5 rounded-lg border border-border">Ch.{ch.chapter_number}</span>
                <div className="min-w-0">
                  <h3 className="font-medium text-text-primary truncate">{ch.title}</h3>
                  {ch.outline && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{ch.outline}</p>}
                </div>
              </Link>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{ch.word_count.toLocaleString()} 字</span>
                  <span className={`px-2 py-0.5 rounded-full ${ch.status === 'draft' ? 'bg-warning/10 text-warning' : ch.status === 'revised' ? 'bg-blue-500/10 text-blue-500' : 'bg-success-bg text-success'}`}>
                    {ch.status === 'draft' ? '草稿' : ch.status === 'revised' ? '已修订' : '定稿'}
                  </span>
                  {ch.scene_type !== 'normal' && <span className="px-2 py-0.5 rounded-full bg-primary-bg text-primary text-xs">重点场景</span>}
                </div>
                <a href={`/api/stories/${id}/export/markdown/${ch.chapter_number}`}
                  onClick={(e) => e.stopPropagation()}
                  title="导出此章"
                  className="text-text-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                  <Icon name="file" className="w-4 h-4" />
                </a>
                <button type="button"
                  onClick={() => handleDelete(ch.chapter_number, ch.title)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === ch.chapter_number}
                  title="删除此章"
                  aria-label={`删除第${ch.chapter_number}章`}
                  className="text-text-muted hover:text-danger disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100 p-1">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
