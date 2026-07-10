import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStory, fetchChapters } from '../lib/api'
import { Icon } from '../components/Icon'

export function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const { data: story, isLoading } = useQuery({
    queryKey: ['story', id],
    queryFn: () => fetchStory(id!),
    enabled: !!id,
  })
  const { data: chapters } = useQuery({
    queryKey: ['chapters', id],
    queryFn: () => fetchChapters(id!),
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  )
  if (!story) return <div className="text-center py-20 text-text-muted">故事不存在</div>

  const genreLabels: Record<string, string> = {
    school: '校园', wuxia: '武侠', isekai: '异世界', western: '西幻',
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">{story.title}</span>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{story.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              {story.rating === 'nsfw' && <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-bg text-primary font-medium">成人向</span>}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-dark text-text-secondary">{genreLabels[story.genre] || story.genre}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-dark text-text-secondary">
                {story.explicit_level === 'mild' ? '简洁' : story.explicit_level === 'moderate' ? '适中' : '详细'}
              </span>
            </div>
          </div>
          <Link to={`/story/${id}/write`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-md shadow-primary/20">
            <Icon name="sparkle" className="w-4 h-4" /> AI写作
          </Link>
        </div>
        {story.synopsis && <p className="text-text-secondary text-sm leading-relaxed">{story.synopsis}</p>}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '章节', value: story.chapter_count || 0, icon: 'file' },
          { label: '总字数', value: (story.total_words || 0).toLocaleString(), icon: 'edit' },
          { label: '角色', value: story.character_count || 0, icon: 'users' },
          { label: '状态', value: story.status === 'planning' ? '规划中' : story.status === 'in-progress' ? '连载中' : story.status === 'completed' ? '已完结' : '暂停', icon: 'clock' },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-card border border-border rounded-xl p-4 text-center shadow-sm card-enter">
            <Icon name={stat.icon} className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold text-text-primary">{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { to: 'bible', label: '故事圣经', icon: 'book', desc: '核心设定' },
          { to: 'characters', label: '角色管理', icon: 'users', desc: '人物与关系' },
          { to: 'world', label: '世界观', icon: 'globe', desc: '地点与体系' },
          { to: 'plot', label: '情节管理', icon: 'chart', desc: '故事与伏笔' },
        ].map(link => (
          <Link key={link.to} to={`/story/${id}/${link.to}`}
            className="bg-bg-card border border-border hover-lift rounded-xl p-4 transition-all shadow-sm">
            <Icon name={link.icon} className="w-5 h-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm">{link.label}</h3>
            <p className="text-xs text-text-muted mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">章节列表</h2>
          <Link to={`/story/${id}/chapters`} className="text-sm text-primary hover:text-primary-dark font-medium">查看全部 →</Link>
        </div>
        {!chapters?.length ? (
          <div className="text-center py-10">
            <Icon name="file" className="w-10 h-10 mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary font-medium mb-1">还没有章节</p>
            <Link to={`/story/${id}/write`} className="text-primary hover:text-primary-dark text-sm font-medium">开始写第一章 →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.slice(-5).reverse().map(ch => (
              <Link key={ch.id} to={`/story/${id}/chapters/${ch.chapter_number}`}
                className="flex items-center justify-between p-3.5 bg-bg-dark hover:bg-bg-card-hover border border-border rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted bg-bg-card px-2.5 py-1 rounded-lg border border-border">Ch.{ch.chapter_number}</span>
                  <span className="text-sm font-medium">{ch.title}</span>
                  {ch.scene_type !== 'normal' && <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary-bg text-primary">重点场景</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{ch.word_count.toLocaleString()} 字</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    ch.status === 'draft' ? 'bg-warning/10 text-warning' :
                    ch.status === 'revised' ? 'bg-blue-500/10 text-blue-500' : 'bg-success-bg text-success'
                  }`}>{ch.status === 'draft' ? '草稿' : ch.status === 'revised' ? '已修订' : '定稿'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
