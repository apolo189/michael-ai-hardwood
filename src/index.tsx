import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import pages from './routes/pages'
import chat from './routes/chat'
import estimate from './routes/estimate'
import upload from './routes/upload'
import lead from './routes/lead'

type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  WEB3FORMS_ACCESS_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Static assets
app.use('/static/*', serveStatic({ root: './public' }))

// API routes
app.route('/api/chat', chat)
app.route('/api/estimate', estimate)
app.route('/api/upload', upload)
app.route('/api/lead', lead)

// Pages (landing page, legal pages, etc.)
app.route('/', pages)

export default app
