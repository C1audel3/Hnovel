import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyzeStoryStyle, fetchStory, getApiErrorMessage, updateStory } from '../lib/api'
import { Icon } from '../components/Icon'
import { useState, useEffect } from 'react'

export function BiblePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: story } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!), enabled: !!id })

  const [form, setForm] = useState({
    title: '', genre: 'school', rating: 'safe', explicit_level: 'moderate',
    synopsis: '', tone_style: '', reference_style: '',
  })
  const [saving, setSaving] = useState<'main' | 'style' | 'profile' | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [styleProfile, setStyleProfile] = useState('')

  useEffect(() => {
    if (story) {
      setStyleProfile(story.style_profile || '')
      setForm({
        title: story.title || '',
        genre: story.genre || 'school',
        rating: (story.rating || 'safe') as string,
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

  const handleAnalyzeStyle = async () => {
    if (form.reference_style.trim().length < 200) {
      alert('参考文风至少需要 200 个字符才能分析')
      return
    }
    setAnalyzing(true)
    try {
      await updateStory(id!, { reference_style: form.reference_style })
      const result = await analyzeStoryStyle(id!)
      setStyleProfile(result.profile)
      await queryClient.invalidateQueries({ queryKey: ['story', id] })
    } catch (error) {
      alert('文风分析失败: ' + getApiErrorMessage(error))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveProfile = () => {
    setSaving('profile')
    saveMutation.mutate({ style_profile: styleProfile })
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
            <Select label="内容分级" field="rating" options={[
              { value: 'safe', label: '一般向' }, { value: 'nsfw', label: '成人向' },
            ]} />
            <Select label="类型" field="genre" options={[
              { value: 'school', label: '校园' }, { value: 'wuxia', label: '武侠' },
              { value: 'isekai', label: '异世界' }, { value: 'western', label: '西幻' },
            ]} />
            <Select label="细节程度" field="explicit_level" options={[
              { value: 'mild', label: '简洁' }, { value: 'moderate', label: '适中' }, { value: 'graphic', label: '详细' },
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
          <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
            <span>{form.reference_style.length.toLocaleString()} 字符</span>
            <span>分析最多读取 12,000 字符</span>
          </div>
          <div className="flex gap-3 mt-3">
            <button type="button" onClick={handleSaveStyle} disabled={saving === 'style'}
              className="px-5 py-2.5 border border-primary/30 text-primary hover:bg-primary-bg disabled:opacity-40 rounded-xl text-sm font-medium transition-all">
              {saving === 'style' && saveMutation.isPending ? '保存中...' : saving === 'style' && !saveMutation.isPending ? '✓ 已保存' : '保存参考文风'}
            </button>
            <button type="button" onClick={handleAnalyzeStyle} disabled={analyzing || form.reference_style.trim().length < 200}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all shadow-sm inline-flex items-center gap-2">
              {analyzing ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />分析中...</> : <><Icon name="sparkle" className="w-4 h-4" />{styleProfile ? '重新分析文风' : 'AI分析文风'}</>}
            </button>
          </div>

          {(styleProfile || story.style_profile) && (
            <div className="mt-5 bg-bg-dark border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="check" className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold">风格档案</h3>
              </div>
              <p className="text-xs text-text-muted mb-2">可以直接修改下面的规则。章节生成时会优先使用保存后的版本。</p>
              <textarea value={styleProfile} onChange={e => setStyleProfile(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-xs text-text-secondary font-sans leading-relaxed focus:border-primary focus:outline-none resize-y" />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-text-muted">{styleProfile.length.toLocaleString()} 字符</span>
                <button type="button" onClick={handleSaveProfile}
                  disabled={(saving === 'profile' && saveMutation.isPending) || styleProfile.length > 20000}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-all">
                  {saving === 'profile' && saveMutation.isPending ? '保存中...' : saving === 'profile' && !saveMutation.isPending ? '✓ 已保存' : '保存风格档案'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={handleSaveAll} disabled={saving === 'main' && saveMutation.isPending}
          className="px-8 py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl transition-all font-medium shadow-sm">
          {saving === 'main' && saveMutation.isPending ? '保存中...' : saving === 'main' && !saveMutation.isPending ? '✓ 已保存' : '保存所有修改'}
        </button>
      </div>
    </div>
  )
}
