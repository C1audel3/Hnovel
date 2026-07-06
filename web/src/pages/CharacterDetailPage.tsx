import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export function CharacterDetailPage() {
  const { id, cid } = useParams<{ id: string; cid: string }>()
  const { data: character } = useQuery({
    queryKey: ['character', id, cid],
    queryFn: () => api.get(`/stories/${id}/characters/${cid}`).then(r => r.data),
    enabled: !!id && !!cid,
  })

  if (!character) return null

  const parseTags = (s: string) => { try { return JSON.parse(s) } catch { return [] } }

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

      {/* Header */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{character.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-dark text-text-secondary border border-border">{character.role}</span>
              {character.gender && <span className="text-xs text-text-muted">{character.gender === 'male' ? '♂ 男' : character.gender === 'female' ? '♀ 女' : character.gender}</span>}
              {character.sexual_orientation && <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-bg text-primary">{character.sexual_orientation}</span>}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">♥ {character.affection_level}</div>
            <div className="text-xs text-text-muted mt-1">好感度</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic info */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">基本信息</h2>
          <div className="space-y-3">
            {[
              { label: '身体特征', value: character.body_features },
              { label: '外貌', value: character.appearance },
              { label: '性格', value: character.personality },
              { label: '背景', value: character.background },
            ].map(f => f.value && (
              <div key={f.label}>
                <p className="text-xs text-text-muted mb-1">{f.label}</p>
                <p className="text-sm text-text-primary">{f.value}</p>
              </div>
            ))}
          </div>
          {character.preferences && parseTags(character.preferences).length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-text-muted mb-2">性偏好</p>
              <div className="flex flex-wrap gap-1.5">
                {parseTags(character.preferences).map((p: string) => (
                  <span key={p} className="text-xs px-2 py-1 rounded-lg bg-primary-bg text-primary">{p}</span>
                ))}
              </div>
            </div>
          )}
          {character.tags && parseTags(character.tags).length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-2">角色标签</p>
              <div className="flex flex-wrap gap-1.5">
                {parseTags(character.tags).map((t: string) => (
                  <span key={t} className="text-xs px-2 py-1 rounded-lg bg-bg-dark text-text-muted border border-border">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Relationships */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">关系网络</h2>
          {character.relationships && character.relationships.length > 0 ? (
            <div className="space-y-2">
              {character.relationships.map((rel: any) => (
                <div key={rel.id} className="flex items-center justify-between p-3 bg-bg-dark rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rel.source_id === character.id ? rel.target_name : rel.source_name}</span>
                    <span className="text-xs text-text-muted">{rel.rel_type}</span>
                  </div>
                  <span className="text-xs text-primary">♥ {rel.intimacy_level}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm">暂无关系数据</p>
              <p className="text-xs text-text-muted mt-1">添加角色后可以建立关系</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
