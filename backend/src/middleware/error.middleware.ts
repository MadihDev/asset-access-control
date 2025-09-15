import { NextFunction, Request, Response } from 'express'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error('[Error]', { status, message, path: req.path, method: req.method, err })
  }

  res.status(status).json({ success: false, error: message })
}
