import { Hono } from 'hono'
import { calculateEstimate, SERVICES, ServiceKey, FinishCoats } from '../lib/pricing'

const estimate = new Hono()

estimate.get('/services', (c) => {
  return c.json({ services: Object.values(SERVICES) })
})

estimate.post('/calculate', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const service = body.service as ServiceKey
  const squareFootage = Number(body.squareFootage) || 0
  const finishCoats = body.finishCoats as FinishCoats | undefined

  if (!service || !SERVICES[service]) {
    return c.json({ error: 'Invalid service type' }, 400)
  }

  if (squareFootage <= 0) {
    return c.json({ error: 'Please provide a valid square footage' }, 400)
  }

  const result = calculateEstimate({ service, squareFootage, finishCoats })
  return c.json(result)
})

export default estimate
