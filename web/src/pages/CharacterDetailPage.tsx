import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Icon } from '../components/Icon'
import { getApiErrorMessage } from '../lib/api'
import type { Character, CharacterRelationship } from '../lib/types'

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
const relTypeLabels: Record<string, string> = {
  ally: '盟友',
  friend: '朋友',
  family: '亲属',
  mentor: '师徒',
  rival: '竞争',
  enemy: '敌对',
  romance: '情感',
  acquaintance: '相识',
}

type CharacterDetail = Character & { relationships?: CharacterRelationship[] }
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

type RelationshipForm = {
  target_id: string
  rel_type: string
  intimacy_level: number
  description: string
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

function toForm(character: CharacterDetail): CharacterForm {
  return {
    name: character.name || '',
    role: character.role || 'supporting',
    status: character.status || 'alive',
    gender: character.gender || '',
    age: character.age || '',
    importance: character.importance || 'medium',
    appearance: character.appearance || '',
    personality: character.personality || '',
    background: character.background || '',
    current_goal: character.current_goal || '',
    voice_style: character.voice_style || '',
    writing_notes: character.writing_notes || '',
    tagsText: parseList(character.tags).join(', '),
  }
}

export function CharacterDetailPage() {
  const { id, cid } = useParams<{ id: string; cid: string }>()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CharacterForm | null>(null)
  const [relationshipForm, setRelationshipForm] = useState<RelationshipForm>({
    target_id: '',
    rel_type: 'acquaintance',
    intimacy_level: 0,
    description: '',
  })

  const { data: character, isLoading } = useQuery<CharacterDetail>({
    queryKey: ['character', id, cid],
    queryFn: () => api.get(`/stories/${id}/characters/${cid}`).then(res => res.data),
    enabled: !!id && !!cid,
  })

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ['characters', id],
    queryFn: () => api.get(`/stories/${id}/characters`).then(res => res.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (character) setForm(toForm(character))
  }, [character])

  const otherCharacters = useMemo(
    () => characters.filter(item => item.id !== cid),
    [characters, cid],
  )

  const saveMutation = useMutation({
    mutationFn: (payload: CharacterForm) => api.put(`/stories/${id}/characters/${cid}`, {
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
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', id, cid] })
      queryClient.invalidateQueries({ queryKey: ['characters', id] })
    },
    onError: error => alert('保存失败: ' + getApiErrorMessage(error)),
  })

  const addRelationshipMutation = useMutation({
    mutationFn: (payload: RelationshipForm) => api.post(`/stories/${id}/characters/${cid}/relationships`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', id, cid] })
      setRelationshipForm({ target_id: '', rel_type: 'acquaintance', intimacy_level: 0, description: '' })
    },
    onError: error => alert('关系保存失败: ' + getApiErrorMessage(error)),
  })

  const deleteRelationshipMutation = useMutation({
    mutationFn: (rid: number) => api.delete(`/stories/${id}/relationships/${rid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['character', id, cid] }),
    onError: error => alert('关系删除失败: ' + getApiErrorMessage(error)),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
  if (!character || !form) return null

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}/characters`} className="hover:text-primary transition-colors">角色</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">{character.name}</span>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{character.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge>{roleLabels[character.role] || character.role}</Badge>
              <Badge tone={character.importance === 'high' ? 'primary' : 'muted'}>{character.importance === 'high' ? '核心' : character.importance === 'low' ? '普通' : '重要'}</Badge>
              {character.gender && <span className="text-xs text-text-muted">{character.gender}</span>}
            </div>
          </div>
          <button type="button" onClick={() => saveMutation.mutate(form)} disabled={!form.name.trim() || saveMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
            <Icon name="check" className="w-4 h-4" /> {saveMutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <section className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Icon name="users" className="w-5 h-5 text-primary" />
            角色档案
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="姓名"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
            <Field label="定位">
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass}>
                {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="状态">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="alive">活跃</option>
                <option value="unknown">未知</option>
                <option value="deceased">退场</option>
              </select>
            </Field>
            <Field label="重要性">
              <select value={form.importance} onChange={e => setForm({ ...form, importance: e.target.value as CharacterForm['importance'] })} className={inputClass}>
                <option value="low">普通</option>
                <option value="medium">重要</option>
                <option value="high">核心</option>
              </select>
            </Field>
            <Field label="性别"><input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inputClass} /></Field>
            <Field label="年龄"><input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className={inputClass} /></Field>
          </div>

          <div className="space-y-4 mt-4">
            <Field label="外貌"><textarea value={form.appearance} onChange={e => setForm({ ...form, appearance: e.target.value })} rows={3} className={`${inputClass} resize-none`} /></Field>
            <Field label="性格"><textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })} rows={3} className={`${inputClass} resize-none`} /></Field>
            <Field label="背景"><textarea value={form.background} onChange={e => setForm({ ...form, background: e.target.value })} rows={3} className={`${inputClass} resize-none`} /></Field>
            <Field label="当前目标"><input value={form.current_goal} onChange={e => setForm({ ...form, current_goal: e.target.value })} className={inputClass} /></Field>
            <Field label="说话风格"><input value={form.voice_style} onChange={e => setForm({ ...form, voice_style: e.target.value })} className={inputClass} /></Field>
            <Field label="写作注意事项"><textarea value={form.writing_notes} onChange={e => setForm({ ...form, writing_notes: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
            <Field label="标签"><input value={form.tagsText} onChange={e => setForm({ ...form, tagsText: e.target.value })} className={inputClass} placeholder="逗号分隔" /></Field>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Icon name="heart" className="w-5 h-5 text-primary" />
              添加关系
            </h2>
            <div className="space-y-4">
              <Field label="目标角色">
                <select value={relationshipForm.target_id} onChange={e => setRelationshipForm({ ...relationshipForm, target_id: e.target.value })} className={inputClass}>
                  <option value="">请选择角色</option>
                  {otherCharacters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="关系类型">
                <select value={relationshipForm.rel_type} onChange={e => setRelationshipForm({ ...relationshipForm, rel_type: e.target.value })} className={inputClass}>
                  {Object.entries(relTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </Field>
              <Field label="亲密度">
                <input type="number" min={0} max={100} value={relationshipForm.intimacy_level} onChange={e => setRelationshipForm({ ...relationshipForm, intimacy_level: Number(e.target.value) })} className={inputClass} />
              </Field>
              <Field label="关系说明">
                <textarea value={relationshipForm.description} onChange={e => setRelationshipForm({ ...relationshipForm, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
              </Field>
              <button type="button" disabled={!relationshipForm.target_id || addRelationshipMutation.isPending}
                onClick={() => addRelationshipMutation.mutate(relationshipForm)}
                className="w-full px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                保存关系
              </button>
            </div>
          </section>

          <section className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Icon name="layers" className="w-5 h-5 text-primary" />
              关系
            </h2>
            {character.relationships?.length ? (
              <div className="space-y-3">
                {character.relationships.map(rel => {
                  const otherName = rel.source_id === character.id ? rel.target_name : rel.source_name
                  return (
                    <div key={rel.id} className="bg-bg-dark border border-border rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{otherName}</div>
                          <div className="text-xs text-text-muted mt-1">{relTypeLabels[rel.rel_type] || rel.rel_type} · 亲密度 {rel.intimacy_level || 0}</div>
                        </div>
                        <button type="button" onClick={() => deleteRelationshipMutation.mutate(rel.id)}
                          className="text-text-muted hover:text-danger transition-colors">
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                      {rel.description && <p className="text-xs text-text-secondary mt-3">{rel.description}</p>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-8">暂无关系</p>
            )}
          </section>
        </aside>
      </div>
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
