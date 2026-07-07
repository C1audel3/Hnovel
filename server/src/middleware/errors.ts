import type { ErrorRequestHandler, RequestHandler } from 'express'

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `接口不存在: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' })
}

export const errorHandler: ErrorRequestHandler = (err: any, _req, res, _next) => {
  console.error('[Hnovel API]', err)
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: '请求体不是合法 JSON', code: 'INVALID_JSON' })
    return
  }
  res.status(500).json({ error: err?.message || '服务器内部错误', code: err?.code || 'INTERNAL_ERROR' })
}
