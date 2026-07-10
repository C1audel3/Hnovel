import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Icon } from '../components/Icon'
import { getApiErrorMessage } from '../lib/api'
import type { Character } from '../lib/types'

const api = axios.create({ baseURL: '/api' })
const inputClass = 'w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none placeholder:text-text-muted'

const roleLabels: Record<string, string> = {
  protagonist: '主角',
  antagonist: '反派',
  'love-interest': '重要关系',
  'harem-member': '重要配角',
  supporting: '配角',
  minor: '次要角色',
}
const importanceLabels: Record<string, string> = { low: '普通', medium: '重要', high: '核心' }

type CharacterForm = {
  name: string
  role: string
  status: string
  gender: string
  age: string
  importance: 'low' | 'medium' | 'high'
  appearance: string
  personality: string
  background: string
  current_goal: string
  voice_style: string
  writing_notes: string
  tagsText: string
}

const emptyForm: CharacterForm = {
  name: '',
  role: 'supporting',
  status: 'alive',
  gender: '',
  age: '',
  importance: 'medium',
  appearance: '',
  personality: '',
  background: '',
  current_goal: '',
  voice_style: '',
  writing_notes: '',
  tagsText: '',
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(String(value || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return String(value || '').split(/[,，\s]+/).filter(Boolean)
  }
}

function splitTags(value: string): string[] {
  return value.split(/[,，\s]+/).map(tag => tag.trim()).filter(Boolean)
}

export function CharactersPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('ai')
  const [form, setForm] = useState<CharacterForm>(emptyForm)
  const [aiInput, setAiInput] = useState({ name: '', gender: '', role: 'supporting', hints: '' })

  const { data: characters = [], isLoading } = useQuery<Character[]>({
    queryKey: ['characters', id],
    queryFn: () => api.get(`/stories/${id}/characters`).then(res => res.data),
    enabled: !!id,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CharacterForm) => api.post(`/stories/${id}/characters`, {
      name: payload.name,
      role: payload.role,
      status: payload.status,
      gender: payload.gender,
      age: payload.age,
      importance: payload.importance,
      appearance: payload.appearance,
      personality: payload.personality,
      background: payload.background,
      current_goal: payload.current_goal,
      voice_style: payload.voice_style,
      writing_notes: payload.writing_notes,
      tags: splitTags(payload.tagsText),
      preferences: [],
      affection_level: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', id] })
      closeCreate()
    },
    onError: error => alert('添加失败: ' + getApiErrorMessage(error)),
  })

  const aiMutation = useMutation({
    mutationFn: () => api.post(`/stories/${id}/characters/generate`, {
      name: aiInput.name || undefined,
      gender: aiInput.gender || undefined,
      role: aiInput.role || undefined,
      hints: aiInput.hints || undefined,
    }).then(res => res.data),
    onSuccess: data => {
      setForm({
        name: data.name || aiInput.name || '',
        role: data.role || aiInput.role || 'supporting',
        status: 'alive',
        gender: data.gender || aiInput.gender || '',
        age: data.age || '',
        importance: data.importance || 'medium',
        appearance: data.appearance || '',
        personality: data.personality || '',
        background: data.background || '',
        current_goal: data.current_goal || data.currentGoal || '',
        voice_style: data.voice_style || data.voiceStyle || '',
        writing_notes: data.writing_notes || data.writingNotes || '',
        tagsText: Array.isArray(data.tags) ? data.tags.join(', ') : String(data.tags || ''),
      })
      setCreateMode('manual')
    },
    onError: error => alert('AI生成失败: ' + getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (cid: string) => api.delete(`/stories/${id}/characters/${cid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters', id] }),
    onError: error => alert('删除失败: ' + getApiErrorMessage(error)),
  })

  const openCreate = () => {
    setShowCreate(true)
    setCreateMode('ai')
    setForm(emptyForm)
  }

  const closeCreate = () => {
    setShowCreate(false)
    setCreateMode('ai')
    setForm(emptyForm)
    setAiInput({ name: '', gender: '', role: 'supporting', hints: '' })
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">角色管理</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">角色管理</h1>
          <p className="text-text-secondary mt-1">轻量维护角色档案，支持 AI 生成后人工修改。</p>
        </div>
        <button type="button" onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-sm">
          <Icon name="plus" className="w-4 h-4" /> 添加角色
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">添加角色</h2>
                <p className="text-xs text-text-muted mt-1">可以先让 AI 起草，再手动微调保存。</p>
              </div>
              <button type="button" onClick={closeCreate} className="text-text-muted hover:text-text-primary">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 bg-bg-dark rounded-xl p-1 mb-5">
              <button type="button" onClick={() => setCreateMode('ai')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${createMode === 'ai' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}>
                <Icon name="sparkle" className="w-4 h-4 inline mr-1" /> AI生成
              </button>
              <button type="button" onClick={() => setCreateMode('manual')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${createMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}>
                手动编辑
              </button>
            </div>

            {createMode === 'ai' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="姓名（可留空）">
                    <input value={aiInput.name} onChange={e => setAiInput({ ...aiInput, name: e.target.value })} className={inputClass} placeholder="让 AI 取名也可以" />
                  </Field>
                  <Field label="性别">
                    <input value={aiInput.gender} onChange={e => setAiInput({ ...aiInput, gender: e.target.value })} className={inputClass} placeholder="可选" />
                  </Field>
                  <Field label="定位">
                    <select value={aiInput.role} onChange={e => setAiInput({ ...aiInput, role: e.target.value })} className={inputClass}>
                      {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="简短提示">
                  <textarea value={aiInput.hints} onChange={e => setAiInput({ ...aiInput, hints: e.target.value })} rows={4}
                    className={`${inputClass} resize-none`} placeholder="例如：沉稳的边境骑士，曾经背叛过主角，但现在想赎罪。" />
                </Field>
                <button type="button" onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}
                  className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2">
                  {aiMutation.isPending ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> 生成中...</> : <><Icon name="sparkle" className="w-4 h-4" /> 生成角色草稿</>}
                </button>
              </div>
            ) : (
              <CharacterFormEditor form={form} setForm={setForm} />
            )}

            {createMode === 'manual' && (
              <div className="flex gap-3 mt-6">
                <button type="button" disabled={!form.name.trim() || createMutation.isPending} onClick={() => createMutation.mutate(form)}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                  {createMutation.isPending ? '保存中...' : '保存角色'}
                </button>
                <button type="button" onClick={closeCreate}
                  className="px-5 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">取消</button>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
      ) : !characters.length ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Icon name="users" className="w-12 h-12 mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary font-medium mb-2">还没有角色</p>
          <button type="button" onClick={openCreate} className="text-primary hover:text-primary-dark text-sm font-medium">添加第一个角色</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {characters.map(char => {
            const tags = parseList(char.tags)
            return (
              <article key={char.id} className="bg-bg-card border border-border hover:border-primary/20 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/story/${id}/characters/${char.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-text-primary">{char.name}</h3>
                      <Badge tone={char.importance === 'high' ? 'primary' : 'muted'}>{importanceLabels[char.importance || 'medium']}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <span>{roleLabels[char.role] || char.role}</span>
                      {char.gender && <><span>·</span><span>{char.gender}</span></>}
                    </div>
                  </Link>
                  <button type="button" onClick={() => {
                    if (confirm(`确定删除角色「${char.name}」吗？相关关系也会删除。`)) deleteMutation.mutate(char.id)
                  }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-bg-dark transition-colors opacity-0 group-hover:opacity-100">
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
                {char.current_goal && <p className="text-sm text-text-secondary mt-3 line-clamp-2">目标：{char.current_goal}</p>}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tags.slice(0, 5).map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-bg-dark text-text-muted border border-border">{tag}</span>)}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CharacterFormEditor({ form, setForm }: { form: CharacterForm; setForm: (form: CharacterForm) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="姓名"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
        <Field label="定位">
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass}>
            {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </Field>
        <Field label="性别"><input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inputClass} /></Field>
        <Field label="年龄"><input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className={inputClass} /></Field>
        <Field label="重要性">
          <select value={form.importance} onChange={e => setForm({ ...form, importance: e.target.value as CharacterForm['importance'] })} className={inputClass}>
            <option value="low">普通</option>
            <option value="medium">重要</option>
            <option value="high">核心</option>
          </select>
        </Field>
        <Field label="当前目标"><input value={form.current_goal} onChange={e => setForm({ ...form, current_goal: e.target.value })} className={inputClass} /></Field>
      </div>
      <Field label="外貌"><textarea value={form.appearance} onChange={e => setForm({ ...form, appearance: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
      <Field label="性格"><textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
      <Field label="背景"><textarea value={form.background} onChange={e => setForm({ ...form, background: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
      <Field label="说话风格"><input value={form.voice_style} onChange={e => setForm({ ...form, voice_style: e.target.value })} className={inputClass} /></Field>
      <Field label="写作注意事项"><textarea value={form.writing_notes} onChange={e => setForm({ ...form, writing_notes: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
      <Field label="标签"><input value={form.tagsText} onChange={e => setForm({ ...form, tagsText: e.target.value })} className={inputClass} placeholder="逗号分隔" /></Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-text-primary mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'primary' | 'muted' }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${
      tone === 'primary'
        ? 'bg-primary-bg text-primary border-primary-border'
        : 'bg-bg-dark text-text-muted border-border'
    }`}>
      {children}
    </span>
  )
}
