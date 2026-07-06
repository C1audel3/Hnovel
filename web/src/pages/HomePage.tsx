import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchStories, createStory, deleteStory } from '../lib/api'
import { Icon } from '../components/Icon'
import type { Story } from '../lib/types'

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newStory, setNewStory] = useState({
    title: '', genre: 'school', rating: 'nsfw' as Story['rating'],
    explicit_level: 'moderate' as Story['explicit_level'],
    target_audience: 'male' as Story['target_audience'],
    pov: 'third-person-limited', synopsis: '', themes: [] as string[],
  })

  const { data: stories, isLoading } = useQuery({ queryKey: ['stories'], queryFn: fetchStories })
  const createMutation = useMutation({
    mutationFn: createStory,
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['stories'] }); setShowCreate(false); navigate(`/story/${data.id}`) },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
  })

  const genreLabels: Record<string, string> = { school: '校园', wuxia: '武侠', isekai: '异世界', western: '西幻' }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">我的故事</h1>
          <p className="text-text-secondary mt-1">管理你的NSFW小说项目</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-md shadow-primary/20 btn-press">
          <Icon name="plus" className="w-4 h-4" /> 创建新故事
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 modal-enter">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">创建新故事</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">标题</label>
                <input type="text" value={newStory.title} placeholder="给你的故事起个名字..."
                  onChange={e => setNewStory({ ...newStory, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">类型</label>
                  <select value={newStory.genre} onChange={e => setNewStory({ ...newStory, genre: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary focus:border-primary focus:outline-none">
                    {Object.entries(genreLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">分级</label>
                  <select value={newStory.rating} onChange={e => setNewStory({ ...newStory, rating: e.target.value as Story['rating'] })}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary focus:border-primary focus:outline-none">
                    <option value="nsfw">NSFW</option><option value="safe">非NSFW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">描写尺度</label>
                  <select value={newStory.explicit_level} onChange={e => setNewStory({ ...newStory, explicit_level: e.target.value as Story['explicit_level'] })}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary focus:border-primary focus:outline-none">
                    <option value="mild">轻度 - 含蓄暗示</option><option value="moderate">中度 - 感官刻画</option><option value="graphic">详细 - 完整描写</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">目标读者</label>
                  <select value={newStory.target_audience} onChange={e => setNewStory({ ...newStory, target_audience: e.target.value as Story['target_audience'] })}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary focus:border-primary focus:outline-none">
                    <option value="male">男频</option><option value="female">女频</option><option value="general">一般向</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">梗概</label>
                <textarea value={newStory.synopsis} placeholder="2-3句话描述你的故事..."
                  onChange={e => setNewStory({ ...newStory, synopsis: e.target.value })} rows={3}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { if (newStory.title.trim()) createMutation.mutate(newStory) }}
                disabled={!newStory.title.trim() || createMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                {createMutation.isPending ? '创建中...' : '创建故事'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">取消</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
      ) : !stories?.length ? (
        <div className="text-center py-20 bg-bg-card border border-border rounded-2xl shadow-sm">
          <Icon name="edit" className="w-12 h-12 mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary text-lg font-medium mb-2">还没有故事</p>
          <p className="text-text-muted text-sm">点击上方按钮开始你的第一部作品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((story, i) => (
            <div key={story.id} style={{ animationDelay: `${i * 0.06}s` }}
              onClick={() => navigate(`/story/${story.id}`)}
              className="bg-bg-card border border-border hover:border-primary/30 rounded-2xl p-5 cursor-pointer transition-all shadow-sm hover-lift group card-enter">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-1">{story.title}</h3>
                {story.rating === 'nsfw' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-bg text-primary font-medium ml-2 flex-shrink-0">NSFW</span>}
              </div>
              {story.synopsis && <p className="text-sm text-text-secondary line-clamp-2 mb-3">{story.synopsis}</p>}
              <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
                <span className="px-2 py-0.5 rounded bg-bg-dark">{genreLabels[story.genre] || story.genre}</span>
                <span className="text-border">&middot;</span>
                <span>{story.explicit_level === 'mild' ? '轻度' : story.explicit_level === 'moderate' ? '中度' : '详细'}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="font-medium text-text-secondary">{story.chapter_count} 章</span>
                <span>{(story.total_words || 0).toLocaleString()} 字</span>
                <span>{story.character_count} 角色</span>
              </div>
              <div className="mt-3 h-1 bg-bg-dark rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, story.chapter_count * 5))}%` }} />
              </div>
              <button type="button" aria-label="删除故事"
                onClick={e => { e.stopPropagation(); if (confirm(`确认删除「${story.title}」？`)) deleteMutation.mutate(story.id) }}
                className="mt-3 text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 text-xs">
                删除故事
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
