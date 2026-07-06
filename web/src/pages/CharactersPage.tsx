import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Icon } from '../components/Icon'

interface Character {
  id: string; name: string; role: string; status: string; gender?: string;
  body_features?: string; preferences: string; tags: string; affection_level: number;
}

const api = axios.create({ baseURL: '/api' })
const roleLabels: Record<string, string> = {
  protagonist: '主角', antagonist: '反派', 'love-interest': '攻略对象',
  'harem-member': '后宫成员', supporting: '配角', minor: '次要角色',
}
const genderLabels: Record<string, string> = { female: '女性', male: '男性', futanari: '扶她', other: '其他' }

export function CharactersPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [aiMode, setAiMode] = useState(true)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiHints, setAiHints] = useState('')
  const [aiName, setAiName] = useState('')
  const [aiGender, setAiGender] = useState('female')
  const [aiRole, setAiRole] = useState('love-interest')

  const [form, setForm] = useState({
    name: '', role: 'love-interest', gender: 'female',
    personality: '', appearance: '', body_features: '', background: '',
    preferences: [] as string[], tags: [] as string[],
    voice_style: '',
  })

  const { data: characters, isLoading } = useQuery<Character[]>({
    queryKey: ['characters', id],
    queryFn: () => api.get(`/stories/${id}/characters`).then(r => r.data),
    enabled: !!id,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/stories/${id}/characters`, { ...data, sexual_orientation: 'heterosexual' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['characters', id] }); closeModal() },
  })

  const closeModal = () => { setShowCreate(false); setAiMode(true); setAiHints(''); setAiName(''); resetForm() }
  const resetForm = () => setForm({ name: '', role: 'love-interest', gender: 'female', personality: '', appearance: '', body_features: '', background: '', preferences: [], tags: [], voice_style: '' })

  const handleAiGenerate = async () => {
    setAiGenerating(true)
    try {
      const { data } = await api.post(`/stories/${id}/characters/generate`, {
        name: aiName || undefined,
        gender: aiGender,
        role: aiRole,
        hints: aiHints || undefined,
      })
      setForm({
        name: data.name || aiName,
        role: data.role || 'love-interest',
        gender: data.gender || aiGender,
        personality: data.personality || '',
        appearance: data.appearance || '',
        body_features: data.body_features || '',
        background: data.background || '',
        preferences: data.preferences || [],
        tags: data.tags || [],
        voice_style: data.voice_style || '',
      })
      setAiMode(false) // Switch to manual edit mode
    } catch (err: any) {
      alert('AI生成失败: ' + (err.response?.data?.error || err.message))
    } finally { setAiGenerating(false) }
  }

  const prefOptions = [
    { key: 'dom', label: '主导' }, { key: 'sub', label: '服从' }, { key: 'switch', label: '可切换' },
    { key: 'tsundere', label: '傲娇' }, { key: 'yandere', label: '病娇' }, { key: 'kuudere', label: '酷娇' },
    { key: 'milf', label: '熟女' }, { key: 'virgin', label: '初次' }, { key: 'experienced', label: '老练' },
  ]
  const tagOptions = [
    { key: 'cultivator', label: '修士' }, { key: 'mortal', label: '凡人' }, { key: 'immortal', label: '仙人' },
    { key: 'demon', label: '妖魔' }, { key: 'deity', label: '神灵' }, { key: 'elf', label: '精灵' },
    { key: 'beastkin', label: '兽人' }, { key: 'vampire', label: '吸血鬼' },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">角色管理</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">角色管理</h1>
          <p className="text-text-secondary mt-1">{characters?.length ? `${characters.length} 个角色` : '管理故事中的所有角色及其关系'}</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-sm">
          <Icon name="plus" className="w-4 h-4" /> 添加角色
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">添加新角色</h2>
              <button type="button" onClick={closeModal} className="text-text-muted hover:text-text-primary">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Mode toggle */}
            {!form.name && (
              <div className="flex gap-1 bg-bg-dark rounded-xl p-1 mb-5">
                <button type="button" onClick={() => { setAiMode(true); setForm({ ...form, name: '' }) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${aiMode ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}>
                  <Icon name="sparkle" className="w-3.5 h-3.5 inline mr-1" />AI生成
                </button>
                <button type="button" onClick={() => { setAiMode(false); setAiHints('') }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!aiMode ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}>
                  <Icon name="edit" className="w-3.5 h-3.5 inline mr-1" />手动填写
                </button>
              </div>
            )}

            {aiMode && !form.name ? (
              /* AI mode - basic inputs */
              <div className="space-y-3">
                <p className="text-xs text-text-muted">输入基本信息，AI将自动生成完整的角色档案</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-primary mb-1">角色姓名 <span className="text-text-muted">(可留空让AI取名)</span></label>
                    <input type="text" value={aiName} placeholder="如: 苏雪"
                      onChange={e => setAiName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">性别</label>
                    <select value={aiGender} onChange={e => setAiGender(e.target.value)}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm">
                      {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">定位</label>
                  <select value={aiRole} onChange={e => setAiRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm">
                    {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">额外提示 <span className="text-text-muted">(可选)</span></label>
                  <textarea value={aiHints} placeholder="给AI的提示，如：冰山美人、表面冷酷内心温柔、曾是杀手..." rows={2}
                    onChange={e => setAiHints(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted" />
                </div>
                <button type="button" onClick={handleAiGenerate} disabled={aiGenerating}
                  className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2">
                  {aiGenerating ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> AI生成中...</>
                  ) : (
                    <><Icon name="sparkle" className="w-4 h-4" /> AI生成角色档案</>
                  )}
                </button>
              </div>
            ) : (
              /* Edit mode (manual or after AI generation) */
              <div className="space-y-3">
                {!aiMode && !form.name && <p className="text-xs text-text-muted">手动填写角色信息</p>}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-primary mb-1">姓名</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">性别</label>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm">
                      {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">角色定位</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm">
                      {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">身体特征</label>
                    <input type="text" value={form.body_features} onChange={e => setForm({ ...form, body_features: e.target.value })}
                      placeholder="身高、体型、三围..."
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">性格</label>
                  <input type="text" value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })}
                    placeholder="性格特质描述..."
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">外貌</label>
                  <input type="text" value={form.appearance} onChange={e => setForm({ ...form, appearance: e.target.value })}
                    placeholder="外貌描述：发型、面容、气质..."
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">背景故事</label>
                  <textarea value={form.background} onChange={e => setForm({ ...form, background: e.target.value })}
                    placeholder="角色的身世和经历..." rows={2}
                    className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1.5">性偏好标签</label>
                  <div className="flex flex-wrap gap-1.5">
                    {prefOptions.map(({ key, label }) => (
                      <button type="button" key={key}
                        onClick={() => setForm({ ...form, preferences: form.preferences.includes(key) ? form.preferences.filter(p => p !== key) : [...form.preferences, key] })}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${form.preferences.includes(key) ? 'bg-primary text-white shadow-sm' : 'bg-bg-dark text-text-secondary border border-border hover:border-primary/30'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1.5">角色类型标签</label>
                  <div className="flex flex-wrap gap-1.5">
                    {tagOptions.map(({ key, label }) => (
                      <button type="button" key={key}
                        onClick={() => setForm({ ...form, tags: form.tags.includes(key) ? form.tags.filter(p => p !== key) : [...form.tags, key] })}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${form.tags.includes(key) ? 'bg-primary text-white shadow-sm' : 'bg-bg-dark text-text-secondary border border-border hover:border-primary/30'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {form.voice_style && (
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">说话风格</label>
                    <input type="text" value={form.voice_style} onChange={e => setForm({ ...form, voice_style: e.target.value })}
                      className="w-full px-3 py-2.5 bg-bg-dark border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                  </div>
                )}
              </div>
            )}

            {/* Bottom buttons */}
            {!aiMode || form.name ? (
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => createMutation.mutate(form)} disabled={!form.name.trim()}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                  {createMutation.isPending ? '保存中...' : '保存角色'}
                </button>
                {form.name && aiGenerating === false && (
                  <button type="button" onClick={() => { if (aiHints) { handleAiGenerate() } else { setAiMode(true); setForm({ ...form, name: '' }) } }}
                    className="px-4 py-2.5 border border-primary/30 text-primary hover:bg-primary-bg rounded-xl text-sm transition-all">
                    <Icon name="sparkle" className="w-4 h-4 inline mr-1" />AI重新生成
                  </button>
                )}
                <button type="button" onClick={closeModal}
                  className="px-5 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">取消</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Character grid - same as before */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
      ) : !characters?.length ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Icon name="users" className="w-12 h-12 mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary font-medium mb-2">还没有角色</p>
          <button type="button" onClick={() => setShowCreate(true)} className="text-primary hover:text-primary-dark text-sm font-medium">添加第一个角色</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map(char => (
            <div key={char.id} className="bg-bg-card border border-border hover:border-primary/20 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{char.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-bg-dark text-text-secondary">{roleLabels[char.role] || char.role}</span>
                    {char.gender && <span className="text-xs text-text-muted">{genderLabels[char.gender] || char.gender}</span>}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{char.affection_level}</div>
                  <div className="text-[10px] text-text-muted">好感度</div>
                </div>
              </div>
              {char.body_features && <p className="text-xs text-text-muted mb-2 line-clamp-1">{char.body_features}</p>}
              <div className="flex flex-wrap gap-1">
                {(() => { try { return JSON.parse(char.preferences).map((p: string) => <span key={p} className="text-xs px-1.5 py-0.5 rounded-lg bg-primary-bg text-primary">{p}</span>) } catch { return null } })()}
                {(() => { try { return JSON.parse(char.tags).map((t: string) => <span key={t} className="text-xs px-1.5 py-0.5 rounded-lg bg-bg-dark text-text-muted border border-border">{t}</span>) } catch { return null } })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
