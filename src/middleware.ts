import type { Context, Next } from 'koa'
import { type Agent, handle } from '@autoscale/agent'

export function autoscale (agent: Agent) {
  return async function (ctx: Context, next: Next) {
    const data = await handle(
      agent,
      {
        method: ctx.method,
        path: ctx.path,
        tokens: ctx.get('autoscale-metric-tokens'),
        start: ctx.get('x-request-start') ?? ctx.get('x-queue-start')
      }
    )

    if (data != null) {
      for (const key in data.headers) {
        const value = data.headers[key]

        if (value != null) {
          ctx.set(key, value)
        }
      }
      ctx.status = data.status
      ctx.body = data.body
    } else {
      await next()
    }
  }
}
