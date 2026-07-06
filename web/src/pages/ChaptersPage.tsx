import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchChapters } from '../lib/api'
import { Icon } from '../components/Icon'

export function ChaptersPage() {
  const { id } = useParams<{ id: string }>()
  const { data: chapters, isLoading } = useQuery({
    queryKey: ['chapters', id], queryFn: () => fetchChapters(id!), enabled: !!id,
  })

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
          {chapters && chapters.length > 0 && (
            <a href={`/api/stories/${id}/export/markdown`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl transition-all text-sm">
              <Icon name="file" className="w-4 h-4" /> 导出全部 MD
            </a>
          )}
          <Link to={`/story/${id}/write`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-sm">
            <Icon name="plus" className="w-4 h-4" /> 写新章节
          </Link>
        </div>
      </div>

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
                  {ch.scene_type !== 'normal' && <span className="px-2 py-0.5 rounded-full bg-primary-bg text-primary text-xs">NSFW</span>}
                </div>
                <a href={`/api/stories/${id}/export/markdown/${ch.chapter_number}`}
                  onClick={(e) => e.stopPropagation()}
                  title="导出此章"
                  className="text-text-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                  <Icon name="file" className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
