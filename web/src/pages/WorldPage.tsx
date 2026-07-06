import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

type Tab = 'locations' | 'systems' | 'factions' | 'artifacts'

interface WorldItem {
  id: string; name: string; type: string; description: string; status: string;
}

const tabs: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'locations', label: '地点', icon: 'mapPin', desc: '城市、洞府、秘境、温泉、青楼等' },
  { id: 'systems', label: '体系', icon: 'settings', desc: '修炼等级、双修功法、ABO、情欲规则' },
  { id: 'factions', label: '势力', icon: 'building', desc: '宗门、世家、帮会、青楼、朝廷' },
  { id: 'artifacts', label: '法宝', icon: 'gem', desc: '媚药、情趣法宝、避孕丹药、束缚法器' },
]

const mockData: Record<Tab, WorldItem[]> = {
  locations: [],
  systems: [],
  factions: [],
  artifacts: [],
}

const typeLabels: Record<Tab, Record<string, string>> = {
  locations: { city: '城市', fortress: '堡垒/洞府', wilderness: '荒野/秘境', brothel: '青楼/妓院', 'hot-spring': '温泉/浴场', bedchamber: '寝宫/闺房', dungeon: '地牢/调教室', other: '其他' },
  systems: { cultivation: '修炼体系', 'dual-cultivation': '双修功法', magic: '魔法体系', abo: 'ABO世界观', aphrodisiac: '媚药体系', curse: '诅咒/法术', body: '特殊体质', other: '其他' },
  factions: { sect: '宗门', family: '世家/家族', guild: '帮会', government: '朝廷/官府', brothel: '青楼势力', other: '其他' },
  artifacts: { aphrodisiac: '媚药/春药', 'sex-toy': '情趣法宝', contraceptive: '避孕丹药', restraint: '束缚法器', 'body-mod': '身体改造', other: '其他' },
}

const typeOptions: Record<Tab, string[]> = {
  locations: ['city', 'fortress', 'wilderness', 'brothel', 'hot-spring', 'bedchamber', 'dungeon', 'other'],
  systems: ['cultivation', 'dual-cultivation', 'magic', 'abo', 'aphrodisiac', 'curse', 'body', 'other'],
  factions: ['sect', 'family', 'guild', 'government', 'brothel', 'other'],
  artifacts: ['aphrodisiac', 'sex-toy', 'contraceptive', 'restraint', 'body-mod', 'other'],
}

export function WorldPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('locations')
  const [items, setItems] = useState<Record<Tab, WorldItem[]>>(mockData)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', type: 'other', description: '' })

  const currentItems = items[activeTab]
  const tab = tabs.find(t => t.id === activeTab)!

  const handleAdd = () => {
    if (!newItem.name.trim()) return
    const item: WorldItem = {
      id: Date.now().toString(),
      name: newItem.name,
      type: newItem.type,
      description: newItem.description,
      status: 'active',
    }
    setItems(prev => ({ ...prev, [activeTab]: [...prev[activeTab], item] }))
    setNewItem({ name: '', type: 'other', description: '' })
    setShowAdd(false)
  }

  const handleDelete = (itemId: string) => {
    setItems(prev => ({ ...prev, [activeTab]: prev[activeTab].filter(i => i.id !== itemId) }))
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-primary transition-colors">工作台</Link>
        <span className="text-border">/</span>
        <Link to={`/story/${id}`} className="hover:text-primary transition-colors">故事</Link>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">世界观</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">世界观</h1>
          <p className="text-text-secondary mt-1">{tab.desc}</p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all font-medium text-sm shadow-sm">
          <Icon name="plus" className="w-4 h-4" /> 添加{tab.label}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-bg-card border border-border rounded-xl p-1 shadow-sm">
        {tabs.map(t => (
          <button type="button" key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-dark'
            }`}>
            <Icon name={t.icon} className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">添加{tab.label}</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">名称</label>
                <input type="text" value={newItem.name} placeholder={`${tab.label}名称...`}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary text-sm focus:border-primary focus:outline-none placeholder:text-text-muted" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">类型</label>
                <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary text-sm focus:border-primary focus:outline-none">
                  {typeOptions[activeTab].map(t => (
                    <option key={t} value={t}>{typeLabels[activeTab][t] || t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">描述</label>
                <textarea value={newItem.description} placeholder={`描述这个${tab.label}...`} rows={3}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-xl text-text-primary text-sm focus:border-primary focus:outline-none resize-none placeholder:text-text-muted" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={handleAdd} disabled={!newItem.name.trim()}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all">
                添加
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-5 py-2.5 border border-border hover:bg-bg-dark text-text-secondary rounded-xl text-sm transition-all">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {currentItems.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Icon name={tab.icon} className="w-12 h-12 mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary font-medium mb-1">还没有{tab.label}</p>
          <p className="text-text-muted text-sm mb-4">点击上方按钮添加第一个{tab.label}</p>
          <button type="button" onClick={() => setShowAdd(true)}
            className="text-primary hover:text-primary-dark text-sm font-medium">
            + 添加{tab.label}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentItems.map(item => (
            <div key={item.id} className="bg-bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-bg border border-primary-border flex items-center justify-center">
                    <Icon name={tab.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-dark text-text-muted">
                      {typeLabels[activeTab][item.type] || item.type}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => handleDelete(item.id)}
                  className="text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
              {item.description && (
                <p className="text-xs text-text-secondary mt-3 line-clamp-2">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
