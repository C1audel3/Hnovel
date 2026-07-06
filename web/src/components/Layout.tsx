import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom'
import { Icon } from './Icon'

export function Layout() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const inStory = !!id && location.pathname !== '/'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
      isActive
        ? 'bg-primary/15 text-text-sidebar-active font-medium'
        : 'text-text-sidebar hover:bg-white/5 hover:text-text-sidebar-active'
    }`

  return (
    <div className="flex h-screen bg-bg-dark">
      <aside className="w-56 bg-bg-sidebar flex flex-col fixed h-full">
        <div className="p-5 border-b border-white/10">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-primary-light hover:text-white transition-colors">
            <Icon name="pen" className="w-5 h-5" />
            Hnovel
          </NavLink>
          <p className="text-xs text-text-sidebar/50 mt-1">NSFW AI写作平台</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLink to="/" end className={linkClass}>
            <Icon name="home" /> 工作台
          </NavLink>

          {inStory && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <p className="text-[10px] text-text-sidebar/40 uppercase tracking-widest font-medium">当前故事</p>
              </div>
              {[
                { to: `/story/${id}`, label: '故事仪表盘', icon: 'folder', end: true },
                { to: `/story/${id}/bible`, label: '故事圣经', icon: 'book' },
                { to: `/story/${id}/characters`, label: '角色管理', icon: 'users' },
                { to: `/story/${id}/world`, label: '世界观', icon: 'globe' },
                { to: `/story/${id}/plot`, label: '情节管理', icon: 'chart' },
                { to: `/story/${id}/chapters`, label: '章节列表', icon: 'file' },
              ].map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                  <Icon name={item.icon} /> {item.label}
                </NavLink>
              ))}
              <div className="pt-2">
                <NavLink to={`/story/${id}/write`} className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-primary/15 text-primary-light hover:bg-primary/25'
                  }`
                }>
                  <Icon name="sparkle" /> AI写作
                </NavLink>
              </div>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-white/10 text-[11px] text-text-sidebar/40 text-center">
          Hnovel v0.1
        </div>
      </aside>

      <main className="flex-1 ml-56 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
