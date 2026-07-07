import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { createStoryArc, createTimelineEvent, deleteStoryArc, fetchPlot, getApiErrorMessage, savePlotStructure } from '../lib/api'
import type { StoryArc as Arc, TimelineEvent } from '../lib/types'


const structureModels = [
  { id: 'qichengzhuanhe', name: '起承转合', desc: '铺垫→发展→转折→收束，经典中式四段', phases: ['起 - 铺垫引入', '承 - 发展推进', '转 - 转折高潮', '合 - 收束余韵'] },
  { id: 'three-act', name: '三幕式', desc: '铺陈→冲突→解决，类型小说常用', phases: ['第一幕 - 建置', '第二幕 - 对抗', '第三幕 - 解决'] },
  { id: 'heros-journey', name: '英雄之旅', desc: '12阶段史诗旅程', phases: ['平凡世界→冒险召唤→拒绝召唤→导师→跨越→考验→深入→磨难→奖励→归途→复活→归来'] },
  { id: 'chapter-style', name: '章回体', desc: '每回收尾留悬念，适合连载', phases: ['楔子→第一回→...→第N回→尾声'] },
]

const arcTypes = [
  { id: 'main', label: '主线', desc: '贯穿全文的核心叙事' },
  { id: 'sub', label: '支线', desc: '辅助主线展开，丰富内容' },
  { id: 'hidden', label: '暗线', desc: '隐藏线索，后期揭示' },
  { id: 'character', label: '人物线', desc: '角色成长与转变' },
]

export function PlotPage() {
  const { id } = useParams<{ id: string }>()
  const { data: plot } = useQuery({ queryKey: ['plot', id], queryFn: () => fetchPlot(id!), enabled: !!id })
  const [selectedStructure, setSelectedStructure] = useState('qichengzhuanhe')
  const [arcs, setArcs] = useState<Arc[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [showAddArc, setShowAddArc] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newArc, setNewArc] = useState({ name: '', type: 'main', characters: '', description: '' })
  const [newEvent, setNewEvent] = useState({ chapter: '', description: '', arc: '' })

  useEffect(() => {
    if (!plot) return
    setSelectedStructure(plot.structureModel)
    setArcs(plot.arcs)
    setEvents(plot.events)
  }, [plot])

  const currentStructure = structureModels.find(s => s.id === selectedStructure)!

  const handleAddArc = async () => {
    if (!newArc.name.trim()) return
    try {
      const arc = await createStoryArc(id!, newArc)
      setArcs(prev => [...prev, arc])
      setNewArc({ name: '', type: 'main', characters: '', description: '' })
      setShowAddArc(false)
    } catch (error) { alert('添加故事线失败: ' + getApiErrorMessage(error)) }
  }

  const handleAddEvent = async () => {
    if (!newEvent.description.trim()) return
    try {
      const event = await createTimelineEvent(id!, newEvent)
      setEvents(prev => [...prev, event])
      setNewEvent({ chapter: '', description: '', arc: '' })
      setShowAddEvent(false)
    } catch (error) { alert('添加时间线事件失败: ' + getApiErrorMessage(error)) }
  }

  const handleDeleteArc = async (arcId: string) => {
    try {
      await deleteStoryArc(id!, arcId)
      setArcs(prev => prev.filter(a => a.id !== arcId))
      setEvents(prev => prev.filter(e => e.arc !== arcId))
    } catch (error) { alert('删除故事线失败: ' + getApiErrorMessage(error)) }
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
      <p className="text-text-secondary mb-6">管理故事结构、故事线、时间线与伏笔</p>

      {/* Structure Selection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">故事结构模型</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {structureModels.map(m => (
            <button type="button" key={m.id}
              onClick={() => {
                setSelectedStructure(m.id)
                void savePlotStructure(id!, m.id).catch(error => alert('保存故事结构失败: ' + getApiErrorMessage(error)))
              }}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedStructure === m.id
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-bg-card border-border hover:border-primary/30 shadow-sm'
              }`}>
              <p className="font-semibold text-sm">{m.name}</p>
              <p className={`text-xs mt-1 ${selectedStructure === m.id ? 'text-white/70' : 'text-text-muted'}`}>{m.desc}</p>
            </button>
          ))}
        </div>
        {/* Structure phases */}
        <div className="mt-4 bg-bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-text-secondary mb-3">{currentStructure.name} · 结构阶段</h3>
          <div className="flex flex-wrap gap-2">
            {currentStructure.phases.map((p, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-bg-dark text-text-secondary text-sm border border-border">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Arcs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">故事线</h2>
          <button type="button" onClick={() => setShowAddArc(true)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium">
            <Icon name="plus" className="w-3.5 h-3.5" /> 添加故事线
          </button>
        </div>

        {showAddArc && (
          <div className="bg-bg-card border border-border rounded-xl p-5 mb-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">名称</label>
                <input type="text" value={newArc.name} placeholder="故事线名称"
                  onChange={e => setNewArc({ ...newArc, name: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">类型</label>
                <select value={newArc.type} onChange={e => setNewArc({ ...newArc, type: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm">
                  {arcTypes.map(t => <option key={t.id} value={t.id}>{t.label} - {t.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">涉及角色</label>
                <input type="text" value={newArc.characters} placeholder="角色名, 逗号分隔"
                  onChange={e => setNewArc({ ...newArc, characters: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-text-primary mb-1">描述</label>
              <input type="text" value={newArc.description} placeholder="简短描述这条故事线的核心内容..."
                onChange={e => setNewArc({ ...newArc, description: e.target.value })}
                className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={handleAddArc} disabled={!newArc.name.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-sm font-medium">添加</button>
              <button type="button" onClick={() => setShowAddArc(false)}
                className="px-4 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-lg text-sm">取消</button>
            </div>
          </div>
        )}

        {arcs.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center shadow-sm">
            <Icon name="layers" className="w-10 h-10 mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary text-sm">暂无故事线</p>
            <p className="text-xs text-text-muted mt-1">添加主线、支线、暗线来组织你的叙事</p>
          </div>
        ) : (
          <div className="space-y-2">
            {arcs.map(arc => (
              <div key={arc.id} className="bg-bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    arc.type === 'main' ? 'bg-primary' : arc.type === 'sub' ? 'bg-warning' : arc.type === 'hidden' ? 'bg-text-muted' : 'bg-success'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{arc.name}</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-bg-dark text-text-muted">
                        {arcTypes.find(t => t.id === arc.type)?.label}
                      </span>
                    </div>
                    {arc.description && <p className="text-xs text-text-muted mt-0.5">{arc.description}</p>}
                    {arc.characters && <p className="text-xs text-text-muted mt-0.5">角色: {arc.characters}</p>}
                  </div>
                </div>
                <button type="button" onClick={() => handleDeleteArc(arc.id)}
                  className="text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">时间线</h2>
          <button type="button" onClick={() => setShowAddEvent(true)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium">
            <Icon name="plus" className="w-3.5 h-3.5" /> 添加事件
          </button>
        </div>

        {showAddEvent && (
          <div className="bg-bg-card border border-border rounded-xl p-5 mb-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">章节</label>
                <input type="text" value={newEvent.chapter} placeholder="如: Ch.3"
                  onChange={e => setNewEvent({ ...newEvent, chapter: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">所属故事线</label>
                <select value={newEvent.arc} onChange={e => setNewEvent({ ...newEvent, arc: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm">
                  <option value="">未指定</option>
                  {arcs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">事件描述</label>
                <input type="text" value={newEvent.description} placeholder="发生了什么..."
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={handleAddEvent} disabled={!newEvent.description.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg text-sm font-medium">添加</button>
              <button type="button" onClick={() => setShowAddEvent(false)}
                className="px-4 py-2 border border-border hover:bg-bg-dark text-text-secondary rounded-lg text-sm">取消</button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center shadow-sm">
            <Icon name="clock" className="w-10 h-10 mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary text-sm">暂无时间线事件</p>
            <p className="text-xs text-text-muted mt-1">写作过程中事件会自动添加，也可以手动添加</p>
          </div>
        ) : (
          <div className="space-y-0">
            {events.sort((a, b) => a.chapter.localeCompare(b.chapter)).map((event, i) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'border-primary bg-primary' : 'border-border bg-bg-card'}`} />
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                </div>
                <div className="pb-5 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {event.chapter && <span className="text-xs font-mono text-primary bg-primary-bg px-2 py-0.5 rounded">{event.chapter}</span>}
                    {event.arc && <span className="text-xs text-text-muted">{
                      arcs.find(a => a.id === event.arc)?.name
                    }</span>}
                  </div>
                  <p className="text-sm text-text-primary">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
