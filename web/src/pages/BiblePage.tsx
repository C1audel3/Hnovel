import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchStory, updateStory } from '../lib/api'
import { Icon } from '../components/Icon'
import { useState, useEffect } from 'react'

export function BiblePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: story } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!), enabled: !!id })

  const [form, setForm] = useState({
    title: '', genre: 'school', rating: 'nsfw', explicit_level: 'moderate',
    synopsis: '', tone_style: '', reference_style: '',
  })
  const [saving, setSaving] = useState<'main' | 'style' | null>(null)

  useEffect(() => {
    if (story) {
      setForm({
        title: story.title || '',
        genre: story.genre || 'school',
        rating: (story.rating || 'nsfw') as string,
        explicit_level: story.explicit_level || 'moderate',
        synopsis: story.synopsis || '',
        tone_style: story.tone_style || '',
        reference_style: (story as any).reference_style || '',
      })
    }
  }, [story])

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const saveMutation = useMutation({
    mutationFn: (data: any) => updateStory(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story', id] })
      setTimeout(() => setSaving(null), 2000)
    },
  })

  const handleSaveAll = () => {
    setSaving('main')
    saveMutation.mutate({
      title: form.title, genre: form.genre, rating: form.rating,
      explicit_level: form.explicit_level, synopsis: form.synopsis,
      tone_style: form.tone_style,
    })
  }

  const handleSaveStyle = () => {
    setSaving('style')
    saveMutation.mutate({ reference_style: form.reference_style })
  }

  const Input = (p: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-text-primary mb-1.5">{p.label}</label>
      <input type={p.type || 'text'} value={(form as any)[p.field]} placeholder={p.placeholder}
        onChange={e => update(p.field, e.target.value)}
        className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
    </div>
  )

  const Select = (p: { label: string; field: string; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-xs font-medium text-text-primary mb-1.5">{p.label}</label>
      <select value={(form as any)[p.field]} onChange={e => update(p.field, e.target.value)}
        className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none">
        {p.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  if (!story) return null

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">故事圣经</span>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">故事圣经</h1>
        <p className="text-text-secondary mb-6">编辑故事的核心设定与参考文风</p>

        {/* Basic info */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-4">基本信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="标题" field="title" placeholder="故事标题" />
            <Select label="分级" field="rating" options={[
              { value: 'nsfw', label: 'NSFW' }, { value: 'safe', label: '非NSFW' },
            ]} />
            <Select label="类型" field="genre" options={[
              { value: 'school', label: '校园' }, { value: 'wuxia', label: '武侠' },
              { value: 'isekai', label: '异世界' }, { value: 'western', label: '西幻' },
            ]} />
            <Select label="描写尺度" field="explicit_level" options={[
              { value: 'mild', label: '轻度' }, { value: 'moderate', label: '中度' }, { value: 'graphic', label: '详细' },
            ]} />
          </div>
        </div>

        {/* Synopsis */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-3">梗概与基调</h2>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">故事梗概</label>
            <textarea value={form.synopsis} onChange={e => update('synopsis', e.target.value)}
              rows={3} placeholder="2-3句话描述你的故事核心..."
              className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted" />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-text-primary mb-1.5">基调与风格</label>
            <textarea value={form.tone_style} onChange={e => update('tone_style', e.target.value)}
              rows={2} placeholder="描述你希望的故事氛围和文风..."
              className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted" />
          </div>
        </div>

        {/* Reference Style */}
        <div className="bg-bg-card border border-primary/30 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="book" className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">参考文风</h2>
          </div>
          <p className="text-xs text-text-muted mb-4">
            将你希望模仿的文风示例粘贴在这里。AI在生成章节时会参考这段文字的语调、用词和节奏。
          </p>
          <textarea value={form.reference_style} onChange={e => update('reference_style', e.target.value)}
            rows={8} placeholder="在这里粘贴你想要AI模仿的文风示例..."
            className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted font-sans leading-relaxed" />
          <button type="button" onClick={handleSaveStyle} disabled={saving === 'style'}
            className="mt-3 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
            {saving === 'style' && saveMutation.isPending ? '保存中...' : saving === 'style' && !saveMutation.isPending ? '✓ 已保存' : '保存参考文风'}
          </button>
        </div>

        <button type="button" onClick={handleSaveAll} disabled={saving === 'main' && saveMutation.isPending}
          className="px-8 py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl transition-all font-medium shadow-sm">
          {saving === 'main' && saveMutation.isPending ? '保存中...' : saving === 'main' && !saveMutation.isPending ? '✓ 已保存' : '保存所有修改'}
        </button>
      </div>
    </div>
  )
}
