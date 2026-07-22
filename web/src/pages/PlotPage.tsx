import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { AiErrorPanel } from '../components/AiErrorPanel'
import {
  createForeshadow,
  createStoryArc,
  createTimelineEvent,
  deleteForeshadow,
  deleteStoryArc,
  deleteTimelineEvent,
  fetchPlot,
  generatePlotDraft,
  getApiErrorDiagnostic,
  getApiErrorMessage,
  savePlotStructure,
} from '../lib/api'
import type { ApiErrorDiagnostic } from '../lib/api'
import type { Foreshadow, StoryArc, TimelineEvent } from '../lib/types'

const structureModels = [
  { id: 'qichengzhuanhe', name: '起承转合', desc: '铺垫→发展→转折→收束' },
  { id: 'three-act', name: '三幕式', desc: '建置→对抗→解决' },
  { id: 'heros-journey', name: '英雄之旅', desc: '成长与冒险' },
  { id: 'chapter-style', name: '章回体', desc: '每回收尾留悬念' },
]

const arcTypes = [
  { id: 'main', label: '主线' },
  { id: 'sub', label: '支线' },
  { id: 'hidden', label: '暗线' },
  { id: 'character', label: '人物线' },
  { id: 'romance', label: '关系线' },
  { id: 'growth', label: '成长线' },
  { id: 'faction', label: '阵营线' },
]

const eventTypes = [
  { id: 'main', label: '主线' },
  { id: 'sub', label: '支线' },
  { id: 'turning', label: '转折' },
  { id: 'foreshadow', label: '伏笔' },
  { id: 'payoff', label: '回收' },
  { id: 'character', label: '角色事件' },
]

const arcStatusLabels = { planned: '计划中', active: '进行中', completed: '已完成', paused: '暂停', abandoned: '废弃' }
const foreshadowStatusLabels = { planned: '未埋', planted: '已埋', 'paid-off': '已回收', abandoned: '废弃' }
const importanceLabels = { low: '低', medium: '中', high: '高' }
const inputClass = 'w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none placeholder:text-text-muted'

const emptyArc = { name: '', type: 'main', status: 'active', startChapter: '', endChapter: '', goal: '', conflict: '', description: '' }
const emptyEvent = { chapter: '', description: '', type: 'main', importance: 'medium', occurred: false }
const emptyForeshadow = { name: '', description: '', setupChapter: '', payoffChapter: '', status: 'planned' }

export function PlotPage() {
  const { id } = useParams<{ id: string }>()
  const { data: plot } = useQuery({ queryKey: ['plot', id], queryFn: () => fetchPlot(id!), enabled: !!id })

  const [selectedStructure, setSelectedStructure] = useState('qichengzhuanhe')
  const [arcs, setArcs] = useState<StoryArc[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [foreshadows, setForeshadows] = useState<Foreshadow[]>([])
  const [showArcForm, setShowArcForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showForeshadowForm, setShowForeshadowForm] = useState(false)
  const [newArc, setNewArc] = useState(emptyArc)
  const [newEvent, setNewEvent] = useState(emptyEvent)
  const [newForeshadow, setNewForeshadow] = useState(emptyForeshadow)
  const [aiInput, setAiInput] = useState<{ kind: 'arc' | 'event' | 'foreshadow'; startChapter: string; endChapter: string; hints: string }>({
    kind: 'arc',
    startChapter: '',
    endChapter: '',
    hints: '',
  })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<ApiErrorDiagnostic | null>(null)

  useEffect(() => {
    if (!plot) return
    setSelectedStructure(plot.structureModel)
    setArcs(plot.arcs)
    setEvents(plot.events)
    setForeshadows(plot.foreshadows || [])
  }, [plot])

  const handleGeneratePlot = async () => {
    setAiGenerating(true)
    setAiError(null)
    try {
      const draft = await generatePlotDraft(id!, aiInput)
      if ((draft.kind || aiInput.kind) === 'event') {
        setNewEvent({
          chapter: String(draft.chapter || aiInput.startChapter || ''),
          description: String(draft.description || ''),
          type: draft.type || 'main',
          importance: draft.importance || 'medium',
          occurred: Boolean(draft.occurred),
        })
        setShowEventForm(true)
      } else if ((draft.kind || aiInput.kind) === 'foreshadow') {
        setNewForeshadow({
          name: String(draft.name || ''),
          setupChapter: String(draft.setupChapter || draft.setup_chapter || aiInput.startChapter || ''),
          payoffChapter: String(draft.payoffChapter || draft.payoff_chapter || aiInput.endChapter || ''),
          status: draft.status || 'planned',
          description: String(draft.description || ''),
        })
        setShowForeshadowForm(true)
      } else {
        setNewArc({
          name: String(draft.name || ''),
          type: draft.type || 'main',
          status: draft.status || 'active',
          startChapter: String(draft.startChapter || draft.start_chapter || aiInput.startChapter || ''),
          endChapter: String(draft.endChapter || draft.end_chapter || aiInput.endChapter || ''),
          goal: String(draft.goal || ''),
          conflict: String(draft.conflict || ''),
          description: String(draft.description || ''),
        })
        setShowArcForm(true)
      }
    } catch (error) {
      setAiError(getApiErrorDiagnostic(error, 'AI 情节生成失败'))
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAddArc = async () => {
    if (!newArc.name.trim()) return
    try {
      const arc = await createStoryArc(id!, {
        ...newArc,
        priority: 'medium',
        currentPhase: '',
        characters: '',
        startChapter: newArc.startChapter ? Number(newArc.startChapter) : undefined,
        endChapter: newArc.endChapter ? Number(newArc.endChapter) : undefined,
      } as Omit<StoryArc, 'id' | 'status'>)
      setArcs(prev => [...prev, arc])
      setNewArc(emptyArc)
      setShowArcForm(false)
    } catch (error) { alert('添加故事线失败: ' + getApiErrorMessage(error)) }
  }

  const handleAddEvent = async () => {
    if (!newEvent.description.trim()) return
    try {
      const event = await createTimelineEvent(id!, { ...newEvent, arc: '', characters: '', notes: '' } as Omit<TimelineEvent, 'id'>)
      setEvents(prev => [...prev, event])
      setNewEvent(emptyEvent)
      setShowEventForm(false)
    } catch (error) { alert('添加时间线事件失败: ' + getApiErrorMessage(error)) }
  }

  const handleAddForeshadow = async () => {
    if (!newForeshadow.name.trim()) return
    try {
      const item = await createForeshadow(id!, { ...newForeshadow, arc: '', notes: '' } as Omit<Foreshadow, 'id'>)
      setForeshadows(prev => [...prev, item])
      setNewForeshadow(emptyForeshadow)
      setShowForeshadowForm(false)
    } catch (error) { alert('添加伏笔失败: ' + getApiErrorMessage(error)) }
  }

  const handleDeleteArc = async (arcId: string) => {
    try {
      await deleteStoryArc(id!, arcId)
      setArcs(prev => prev.filter(arc => arc.id !== arcId))
    } catch (error) { alert('删除故事线失败: ' + getApiErrorMessage(error)) }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteTimelineEvent(id!, eventId)
      setEvents(prev => prev.filter(event => event.id !== eventId))
    } catch (error) { alert('删除事件失败: ' + getApiErrorMessage(error)) }
  }

  const handleDeleteForeshadow = async (foreshadowId: string) => {
    try {
      await deleteForeshadow(id!, foreshadowId)
      setForeshadows(prev => prev.filter(item => item.id !== foreshadowId))
    } catch (error) { alert('删除伏笔失败: ' + getApiErrorMessage(error)) }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">情节管理</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">情节管理</h1>
      <p className="text-text-secondary mb-6">轻量维护故事线、时间线与伏笔，并支持 AI 生成草稿。</p>
      <AiErrorPanel diagnostic={aiError} onClose={() => setAiError(null)} />

      <section className="bg-bg-card border border-border rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><Icon name="sparkle" className="w-5 h-5 text-primary" />AI 生成情节草稿</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="生成类型">
            <select value={aiInput.kind} onChange={e => setAiInput({ ...aiInput, kind: e.target.value as typeof aiInput.kind })} className={inputClass}>
              <option value="arc">故事线</option>
              <option value="event">时间线事件</option>
              <option value="foreshadow">伏笔</option>
            </select>
          </Field>
          <Field label="起始章节"><input value={aiInput.startChapter} onChange={e => setAiInput({ ...aiInput, startChapter: e.target.value })} className={inputClass} placeholder="可选" /></Field>
          <Field label="结束章节"><input value={aiInput.endChapter} onChange={e => setAiInput({ ...aiInput, endChapter: e.target.value })} className={inputClass} placeholder="可选" /></Field>
          <div className="flex items-end">
            <button type="button" onClick={handleGeneratePlot} disabled={aiGenerating}
              className="w-full px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-sm font-medium">
              {aiGenerating ? '生成中...' : '生成草稿'}
            </button>
          </div>
        </div>
        <Field label="补充提示">
          <textarea value={aiInput.hints} onChange={e => setAiInput({ ...aiInput, hints: e.target.value })} rows={3}
            className={`${inputClass} resize-none mt-3`} placeholder="例如：主角第一次意识到反派并非真正敌人。" />
        </Field>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">故事结构</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {structureModels.map(model => (
            <button type="button" key={model.id}
              onClick={() => {
                setSelectedStructure(model.id)
                void savePlotStructure(id!, model.id).catch(error => alert('保存故事结构失败: ' + getApiErrorMessage(error)))
              }}
              className={`text-left p-4 rounded-xl border transition-all ${selectedStructure === model.id
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-bg-card border-border hover:border-primary/30 shadow-sm'}`}>
              <p className="font-semibold text-sm">{model.name}</p>
              <p className={`text-xs mt-1 ${selectedStructure === model.id ? 'text-white/70' : 'text-text-muted'}`}>{model.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <PlanningSection title="故事线" actionLabel="添加故事线" onAction={() => setShowArcForm(true)}>
        {showArcForm && (
          <FormCard>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="名称"><input value={newArc.name} onChange={e => setNewArc({ ...newArc, name: e.target.value })} className={inputClass} /></Field>
              <Field label="类型"><select value={newArc.type} onChange={e => setNewArc({ ...newArc, type: e.target.value })} className={inputClass}>{arcTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
              <Field label="状态"><select value={newArc.status} onChange={e => setNewArc({ ...newArc, status: e.target.value })} className={inputClass}><option value="planned">计划中</option><option value="active">进行中</option><option value="completed">已完成</option><option value="paused">暂停</option><option value="abandoned">废弃</option></select></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="起"><input value={newArc.startChapter} onChange={e => setNewArc({ ...newArc, startChapter: e.target.value })} className={inputClass} /></Field>
                <Field label="止"><input value={newArc.endChapter} onChange={e => setNewArc({ ...newArc, endChapter: e.target.value })} className={inputClass} /></Field>
              </div>
            </div>
            <Field label="目标"><input value={newArc.goal} onChange={e => setNewArc({ ...newArc, goal: e.target.value })} className={inputClass} /></Field>
            <Field label="冲突"><input value={newArc.conflict} onChange={e => setNewArc({ ...newArc, conflict: e.target.value })} className={inputClass} /></Field>
            <Field label="描述"><textarea value={newArc.description} onChange={e => setNewArc({ ...newArc, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
            <FormActions onConfirm={handleAddArc} onCancel={() => setShowArcForm(false)} disabled={!newArc.name.trim()} />
          </FormCard>
        )}
        {arcs.length === 0 ? <Empty icon="layers" title="暂无故事线" desc="添加主线、支线或人物线。" /> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {arcs.map(arc => (
              <Card key={arc.id} onDelete={() => handleDeleteArc(arc.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{arc.name}</span>
                  <Badge>{arcTypes.find(t => t.id === arc.type)?.label || arc.type}</Badge>
                  <Badge>{arcStatusLabels[arc.status] || arc.status}</Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">{arc.startChapter || arc.endChapter ? `章节：${arc.startChapter || '?'}-${arc.endChapter || '?'}` : '章节范围未定'}</p>
                {arc.goal && <p className="text-xs text-text-secondary mt-2">目标：{arc.goal}</p>}
                {arc.conflict && <p className="text-xs text-text-secondary mt-1">冲突：{arc.conflict}</p>}
                {arc.description && <p className="text-xs text-text-muted mt-1">{arc.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </PlanningSection>

      <PlanningSection title="时间线" actionLabel="添加事件" onAction={() => setShowEventForm(true)}>
        {showEventForm && (
          <FormCard>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="章节"><input value={newEvent.chapter} onChange={e => setNewEvent({ ...newEvent, chapter: e.target.value })} className={inputClass} /></Field>
              <Field label="类型"><select value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })} className={inputClass}>{eventTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
              <Field label="重要性"><select value={newEvent.importance} onChange={e => setNewEvent({ ...newEvent, importance: e.target.value })} className={inputClass}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></Field>
              <label className="flex items-end gap-2 text-sm text-text-secondary pb-2"><input type="checkbox" checked={newEvent.occurred} onChange={e => setNewEvent({ ...newEvent, occurred: e.target.checked })} /> 已发生</label>
            </div>
            <Field label="事件描述"><textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
            <FormActions onConfirm={handleAddEvent} onCancel={() => setShowEventForm(false)} disabled={!newEvent.description.trim()} />
          </FormCard>
        )}
        {events.length === 0 ? <Empty icon="clock" title="暂无时间线事件" desc="记录关键转折和阶段事件。" /> : (
          <div className="space-y-3">
            {[...events].sort((a, b) => a.chapter.localeCompare(b.chapter, 'zh-CN', { numeric: true })).map(event => (
              <Card key={event.id} onDelete={() => handleDeleteEvent(event.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  {event.chapter && <Badge>{event.chapter}</Badge>}
                  <Badge>{eventTypes.find(t => t.id === event.type)?.label || event.type}</Badge>
                  <Badge>{importanceLabels[event.importance]}</Badge>
                  {event.occurred && <Badge>已发生</Badge>}
                </div>
                <p className="text-sm text-text-primary mt-2">{event.description}</p>
              </Card>
            ))}
          </div>
        )}
      </PlanningSection>

      <PlanningSection title="伏笔" actionLabel="添加伏笔" onAction={() => setShowForeshadowForm(true)}>
        {showForeshadowForm && (
          <FormCard>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="名称"><input value={newForeshadow.name} onChange={e => setNewForeshadow({ ...newForeshadow, name: e.target.value })} className={inputClass} /></Field>
              <Field label="埋设章节"><input value={newForeshadow.setupChapter} onChange={e => setNewForeshadow({ ...newForeshadow, setupChapter: e.target.value })} className={inputClass} /></Field>
              <Field label="回收章节"><input value={newForeshadow.payoffChapter} onChange={e => setNewForeshadow({ ...newForeshadow, payoffChapter: e.target.value })} className={inputClass} /></Field>
              <Field label="状态"><select value={newForeshadow.status} onChange={e => setNewForeshadow({ ...newForeshadow, status: e.target.value })} className={inputClass}><option value="planned">未埋</option><option value="planted">已埋</option><option value="paid-off">已回收</option><option value="abandoned">废弃</option></select></Field>
            </div>
            <Field label="描述"><textarea value={newForeshadow.description} onChange={e => setNewForeshadow({ ...newForeshadow, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></Field>
            <FormActions onConfirm={handleAddForeshadow} onCancel={() => setShowForeshadowForm(false)} disabled={!newForeshadow.name.trim()} />
          </FormCard>
        )}
        {foreshadows.length === 0 ? <Empty icon="sparkle" title="暂无伏笔" desc="记录埋设与回收，避免长篇遗忘线索。" /> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {foreshadows.map(item => (
              <Card key={item.id} onDelete={() => handleDeleteForeshadow(item.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{item.name}</span>
                  <Badge>{foreshadowStatusLabels[item.status] || item.status}</Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">埋设：{item.setupChapter || '未定'} · 回收：{item.payoffChapter || '未定'}</p>
                {item.description && <p className="text-xs text-text-secondary mt-2">{item.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </PlanningSection>
    </div>
  )
}

function PlanningSection({ title, actionLabel, onAction, children }: { title: string; actionLabel: string; onAction: () => void; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{title}</h2>
        <button type="button" onClick={onAction} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium">
          <Icon name="plus" className="w-3.5 h-3.5" /> {actionLabel}
        </button>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium text-text-primary mb-1">{label}</span>{children}</label>
}

function FormCard({ children }: { children: ReactNode }) {
  return <div className="bg-bg-card border border-border rounded-xl p-5 mb-4 shadow-sm space-y-3">{children}</div>
}

function Card({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <button type="button" onClick={onDelete} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100">
          <Icon name="trash" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="text-xs px-1.5 py-0.5 rounded bg-bg-dark text-text-muted border border-border">{children}</span>
}

function Empty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-8 text-center shadow-sm">
      <Icon name={icon} className="w-10 h-10 mx-auto mb-3 text-text-muted" />
      <p className="text-text-secondary text-sm">{title}</p>
      <p className="text-xs text-text-muted mt-1">{desc}</p>
    </div>
  )
}

function FormActions({ onConfirm, onCancel, disabled }: { onConfirm: () => void; onCancel: () => void; disabled: boolean }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onConfirm} disabled={disabled}
        className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-sm font-medium">保存</button>
      <button type="button" onClick={onCancel}
        className="px-4 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-lg text-sm">取消</button>
    </div>
  )
}
