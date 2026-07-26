import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import pages from './routes/pages'
import chat from './routes/chat'
import estimate from './routes/estimate'
import lead from './routes/lead'
import admin from './routes/admin'
import visits from './routes/visits'
import share from './routes/share'
import card from './routes/card'
import hub from './routes/hub'
import { contractAdmin, contractPublic } from './routes/contract'

type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  WEB3FORMS_ACCESS_KEY: string
  ADMIN_PASSWORD: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Static assets
app.use('/static/*', serveStatic({ root: './public' }))

// API routes
app.route('/api/chat', chat)
app.route('/api/estimate', estimate)
app.route('/api/lead', lead)

// Read-only leads dashboard (password-protected). Completely separate from
// the booking form / email flow above — see src/routes/admin.ts.
app.route('/admin', admin)

// Site visit notes (measurements + photos), password-protected — see
// src/routes/visits.ts. Also isolated from the booking form / email flow.
app.route('/admin/visits', visits)

// Electronic signature contracts, generated from a Site Visit — create
// route is password-protected (mounted alongside /admin/visits), the
// signing page itself is public/no-login (mounted at /firmar) — see
// src/routes/contract.ts
app.route('/admin/visits', contractAdmin)
app.route('/firmar', contractPublic)

// Public, no-login, read-only share page for a single visit (WhatsApp link
// to subcontractor) — scoped by an unguessable share_token, see src/routes/share.ts.
app.route('/share', share)

// Digital business card (single shareable page, no login) — see src/routes/card.ts
app.route('/tarjeta', card)
app.route('/card', card)

// Central hub — one page linking to every tool (card, admin panels, site,
// GitHub). No login itself; each admin link still requires its own password.
// See src/routes/hub.ts
app.route('/hub', hub)

// Pages (landing page, legal pages, etc.)
app.route('/', pages)

export default app
