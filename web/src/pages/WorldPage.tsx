import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { createWorldItem, deleteWorldItem, fetchWorldItems, generateWorldItemDraft, getApiErrorMessage, updateWorldItem } from '../lib/api'
import type { WorldCategory, WorldItem } from '../lib/types'

type WorldItemForm = Omit<WorldItem, 'id'>

const tabs: { id: WorldCategory; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: '基础设定', icon: 'globe', desc: '时代、社会、文化与整体氛围' },
  { id: 'locations', label: '地点', icon: 'mapPin', desc: '国家、城市、据点、遗迹' },
  { id: 'factions', label: '势力', icon: 'building', desc: '组织、家族、阵营、机构' },
  { id: 'systems', label: '规则体系', icon: 'settings', desc: '能力、法律、科技、成长规则' },
  { id: 'artifacts', label: '道具概念', icon: 'gem', desc: '关键物品、资源、特殊概念' },
  { id: 'terms', label: '术语表', icon: 'book', desc: '专有名词、称谓、历史事件' },
]

const typeOptions: Record<WorldCategory, string[]> = {
  overview: ['era', 'society', 'culture', 'history', 'theme', 'other'],
  locations: ['country', 'city', 'region', 'base', 'school', 'ruins', 'other'],
  factions: ['government', 'family', 'company', 'sect', 'guild', 'military', 'other'],
  systems: ['power', 'magic', 'technology', 'law', 'economy', 'growth', 'taboo', 'other'],
  artifacts: ['item', 'weapon', 'resource', 'technology', 'document', 'symbol', 'other'],
  terms: ['term', 'title', 'event', 'custom', 'calendar', 'language', 'other'],
}

const typeLabels: Record<WorldCategory, Record<string, string>> = {
  overview: { era: '时代背景', society: '社会制度', culture: '文化习俗', history: '历史背景', theme: '主题氛围', other: '其他' },
  locations: { country: '国家', city: '城市', region: '区域', base: '据点', school: '学院/机构', ruins: '遗迹', other: '其他' },
  factions: { government: '官方', family: '家族', company: '公司', sect: '学派/宗门', guild: '公会/帮派', military: '军队', other: '其他' },
  systems: { power: '能力体系', magic: '超凡规则', technology: '科技体系', law: '法律规则', economy: '经济资源', growth: '成长规则', taboo: '禁忌限制', other: '其他' },
  artifacts: { item: '关键物品', weapon: '武器装备', resource: '稀缺资源', technology: '特殊技术', document: '文献档案', symbol: '象征概念', other: '其他' },
  terms: { term: '术语', title: '称谓', event: '历史事件', custom: '习俗', calendar: '历法时间', language: '语言文字', other: '其他' },
}

const importanceLabels = { low: '普通', medium: '重要', high: '核心' }
const inputClass = 'w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none placeholder:text-text-muted'

function createDefaultForm(category: WorldCategory): WorldItemForm {
  return {
    category,
    name: '',
    type: typeOptions[category][0] || 'other',
    summary: '',
    description: '',
    rules: '',
    connections: '',
    tags: '',
    importance: 'medium',
    status: 'active',
  }
}

export function WorldPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<WorldCategory>('overview')
  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [editingItem, setEditingItem] = useState<WorldItem | null>(null)
  const [form, setForm] = useState<WorldItemForm>(() => createDefaultForm('overview'))
  const [aiInput, setAiInput] = useState({ name: '', hints: '' })

  const { data: items = [] } = useQuery({
    queryKey: ['world-items', id],
    queryFn: () => fetchWorldItems(id!),
    enabled: !!id,
  })

  const currentItems = useMemo(() => items.filter(item => item.category === activeTab), [items, activeTab])
  const activeConfig = tabs.find(tab => tab.id === activeTab)!

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['world-items', id] })

  const addMutation = useMutation({
    mutationFn: (item: WorldItemForm) => createWorldItem(id!, item),
    onSuccess: () => invalidate(),
    onError: error => alert('添加失败: ' + getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, item }: { itemId: string; item: WorldItemForm }) => updateWorldItem(id!, itemId, item),
    onSuccess: () => invalidate(),
    onError: error => alert('保存失败: ' + getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteWorldItem(id!, itemId),
    onSuccess: () => invalidate(),
    onError: error => alert('删除失败: ' + getApiErrorMessage(error)),
  })

  const aiMutation = useMutation({
    mutationFn: () => generateWorldItemDraft(id!, { category: activeTab, name: aiInput.name || undefined, hints: aiInput.hints || undefined }),
    onSuccess: draft => {
      const category = (draft.category || activeTab) as WorldCategory
      setForm({
        ...createDefaultForm(category),
        category,
        name: draft.name || aiInput.name || '',
        type: draft.type || typeOptions[category][0] || 'other',
        importance: draft.importance || 'medium',
        summary: draft.summary || '',
        description: draft.description || '',
        rules: draft.rules || '',
        tags: String(draft.tags || ''),
      })
      setActiveTab(category)
      setMode('manual')
      setEditingItem(null)
    },
    onError: error => alert('AI生成失败: ' + getApiErrorMessage(error)),
  })

  const beginCreate = () => {
    setEditingItem(null)
    setForm(createDefaultForm(activeTab))
    setMode('ai')
    setAiInput({ name: '', hints: '' })
  }

  const beginEdit = (item: WorldItem) => {
    setEditingItem(item)
    setMode('manual')
    setForm({
      ...createDefaultForm(item.category),
      ...item,
      status: 'active',
      connections: item.connections || '',
    })
  }

  const handleCategoryChange = (category: WorldCategory) => {
    const validType = typeOptions[category].includes(form.type) ? form.type : typeOptions[category][0]
    setForm({ ...form, category, type: validType })
  }

  const resetForm = () => {
    setEditingItem(null)
    setForm(createDefaultForm(activeTab))
    setMode('ai')
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    const payload = { ...form, status: 'active' as const, connections: '', startChapter: undefined, endChapter: undefined }
    try {
      if (editingItem) await updateMutation.mutateAsync({ itemId: editingItem.id, item: payload })
      else await addMutation.mutateAsync(payload)
      setActiveTab(payload.category)
      resetForm()
    } catch {
      // onError displays the API message.
    }
  }

  const isSaving = addMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">世界观</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">世界观</h1>
          <p className="text-text-secondary mt-1">轻量维护设定，支持 AI 生成草稿后手动确认。</p>
        </div>
        <button type="button" onClick={beginCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-sm">
          <Icon name="plus" className="w-4 h-4" /> 新增设定
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-6">
        {tabs.map(tab => {
          const count = items.filter(item => item.category === tab.id).length
          return (
            <button type="button" key={tab.id} onClick={() => {
              setActiveTab(tab.id)
              if (!editingItem) setForm(createDefaultForm(tab.id))
            }}
              className={`text-left bg-bg-card border rounded-xl p-3 transition-all ${
                activeTab === tab.id ? 'border-primary shadow-sm ring-2 ring-primary/10' : 'border-border hover:border-primary/40'
              }`}>
              <div className="flex items-center justify-between gap-2">
                <Icon name={tab.icon} className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'text-text-muted'}`} />
                <span className="text-xs text-text-muted">{count}</span>
              </div>
              <div className="font-semibold text-sm mt-2">{tab.label}</div>
              <div className="text-xs text-text-muted mt-1 line-clamp-2">{tab.desc}</div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <section>
          <div className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <Icon name={activeConfig.icon} className="w-5 h-5 text-primary" />
              {activeConfig.label}
            </h2>
            <p className="text-sm text-text-secondary mt-1">{activeConfig.desc}</p>
          </div>

          {currentItems.length === 0 ? (
            <Empty icon={activeConfig.icon} title={`还没有${activeConfig.label}`} desc="先生成或添加一条设定，后续 AI 写作会参考它。" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentItems.map(item => (
                <article key={item.id} className="bg-bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <Badge tone={item.importance === 'high' ? 'primary' : 'muted'}>{importanceLabels[item.importance] || item.importance}</Badge>
                      </div>
                      <div className="text-xs text-text-muted mt-1">{typeLabels[item.category]?.[item.type] || item.type}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => beginEdit(item)} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-bg transition-colors">
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => deleteMutation.mutate(item.id)} className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-bg-dark transition-colors">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {item.summary && <p className="text-sm text-text-secondary mt-3">{item.summary}</p>}
                  {item.rules && <p className="text-xs text-text-muted mt-2">规则：{item.rules}</p>}
                  {item.tags && <TagList tags={item.tags} />}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm h-fit xl:sticky xl:top-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">{editingItem ? '编辑设定' : '新增设定'}</h2>
            {editingItem && <button type="button" onClick={resetForm} className="text-xs text-text-muted hover:text-primary">取消编辑</button>}
          </div>

          {!editingItem && (
            <div className="flex gap-1 bg-bg-dark rounded-xl p-1 mb-5">
              <button type="button" onClick={() => setMode('ai')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'ai' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}>
                <Icon name="sparkle" className="w-4 h-4 inline mr-1" /> AI生成
              </button>
              <button type="button" onClick={() => setMode('manual')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}>
                手动编辑
              </button>
            </div>
          )}

          {mode === 'ai' && !editingItem ? (
            <div className="space-y-4">
              <Field label="分类">
                <select value={activeTab} onChange={e => setActiveTab(e.target.value as WorldCategory)} className={inputClass}>
                  {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                </select>
              </Field>
              <Field label="名称（可留空）">
                <input value={aiInput.name} onChange={e => setAiInput({ ...aiInput, name: e.target.value })} placeholder="让 AI 命名也可以" className={inputClass} />
              </Field>
              <Field label="简短提示">
                <textarea value={aiInput.hints} onChange={e => setAiInput({ ...aiInput, hints: e.target.value })}
                  rows={4} placeholder="例如：边境城市，表面繁华，地下有走私网络。" className={`${inputClass} resize-none`} />
              </Field>
              <button type="button" onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}
                className="w-full px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                {aiMutation.isPending ? '生成中...' : '生成设定草稿'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="分类">
                <select value={form.category} onChange={e => handleCategoryChange(e.target.value as WorldCategory)} className={inputClass}>
                  {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="名称"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
                <Field label="类型">
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputClass}>
                    {typeOptions[form.category].map(type => <option key={type} value={type}>{typeLabels[form.category][type] || type}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="重要性">
                <select value={form.importance} onChange={e => setForm({ ...form, importance: e.target.value as WorldItemForm['importance'] })} className={inputClass}>
                  <option value="low">普通</option>
                  <option value="medium">重要</option>
                  <option value="high">核心</option>
                </select>
              </Field>
              <Field label="一句话摘要"><input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} className={inputClass} /></Field>
              <Field label="详细说明"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className={`${inputClass} resize-none`} /></Field>
              <Field label="规则约束"><textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} rows={3} className={`${inputClass} resize-none`} /></Field>
              <Field label="标签"><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="逗号分隔" /></Field>
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={!form.name.trim() || isSaving} onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                  {isSaving ? '保存中...' : editingItem ? '保存修改' : '添加设定'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">清空</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium text-text-primary mb-1.5">{label}</span>{children}</label>
}

function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'primary' | 'muted' }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${tone === 'primary' ? 'bg-primary-bg text-primary border-primary-border' : 'bg-bg-dark text-text-muted border-border'}`}>{children}</span>
}

function TagList({ tags }: { tags: string }) {
  const list = tags.split(/[,，\s]+/).filter(Boolean).slice(0, 8)
  if (list.length === 0) return null
  return <div className="flex flex-wrap gap-1.5 mt-3">{list.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-bg-dark text-text-muted border border-border">{tag}</span>)}</div>
}

function Empty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
      <Icon name={icon} className="w-12 h-12 mx-auto mb-4 text-text-muted" />
      <p className="text-text-secondary font-medium mb-1">{title}</p>
      <p className="text-text-muted text-sm">{desc}</p>
    </div>
  )
}
