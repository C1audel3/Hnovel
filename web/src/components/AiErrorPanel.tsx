import { Icon } from './Icon'
import type { ApiErrorDiagnostic } from '../lib/api'

export function AiErrorPanel({ diagnostic, onClose }: { diagnostic: ApiErrorDiagnostic | null; onClose?: () => void }) {
  if (!diagnostic) return null

  const text = JSON.stringify(diagnostic, null, 2)
  const hasDetails = Boolean(diagnostic.details) || Boolean(diagnostic.raw)
  const copy = () => {
    void navigator.clipboard?.writeText(text).catch(() => undefined)
  }

  return (
    <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="flame" className="w-5 h-5 text-danger" />
            <h2 className="font-semibold text-danger">{diagnostic.title}</h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">{diagnostic.message}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="px-3 py-1.5 border border-border rounded-lg text-xs text-text-secondary hover:bg-bg-dark">
            复制诊断
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary">
              <Icon name="x" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
        <Info label="时间" value={diagnostic.createdAt} />
        <Info label="状态码" value={diagnostic.status ? String(diagnostic.status) : '无'} />
        <Info label="错误码" value={diagnostic.code || '无'} />
        <Info label="接口" value={`${diagnostic.method || ''} ${diagnostic.url || ''}`.trim() || '无'} />
      </div>

      {hasDetails && (
        <details className="mt-3 bg-bg-dark border border-border rounded-xl p-3">
          <summary className="cursor-pointer text-xs font-medium text-text-secondary">查看详细诊断</summary>
          <pre className="mt-2 text-xs text-text-muted whitespace-pre-wrap overflow-auto max-h-64">{text}</pre>
        </details>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-2">
      <div className="text-text-muted">{label}</div>
      <div className="text-text-secondary truncate mt-0.5" title={value}>{value}</div>
    </div>
  )
}
