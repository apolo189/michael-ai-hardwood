import { Hono } from 'hono'
import { detailPageBody, pageShell } from './visits'

// ---------------------------------------------------------------------------
// PUBLIC, NO-LOGIN, READ-ONLY share view for a single site visit — this is
// the link Luis sends to a subcontractor over WhatsApp. Access is scoped by
// an unguessable random share_token (not the numeric id), never requires
// the admin password, and only ever exposes ONE visit's data — never a
// list of all visits/leads. Completely isolated from /admin/* auth and
// from the booking form / email flow.
// ---------------------------------------------------------------------------

type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
}

const share = new Hono<{ Bindings: Bindings }>()

share.get('/visit/:token', async (c) => {
  const token = c.req.param('token')
  const { env } = c

  const visit = await env.DB.prepare('SELECT * FROM site_visits WHERE share_token = ?').bind(token).first() as any
  if (!visit) return c.text('This link is invalid or has expired.', 404)

  const { results: rooms } = await env.DB.prepare('SELECT * FROM site_visit_rooms WHERE visit_id = ? ORDER BY sort_order, id').bind(visit.id).all()
  const { results: photos } = await env.DB.prepare('SELECT * FROM site_visit_photos WHERE visit_id = ? ORDER BY created_at').bind(visit.id).all()

  // Reuse the same detail layout as the admin view, but isAdminView=false
  // hides pricing/pricing-notes/edit controls/share-link box.
  const body = detailPageBody(visit, rooms || [], photos || [], '', false)
    .replace(/\/admin\/visits\/(\d+)\/photo\//g, `/share/visit/${token}/photo/`)

  return c.html(pageShell(`Job Details — ${visit.client_name || ''}`, body))
})

// Public photo serving, scoped by share_token (not the admin session) —
// verifies the requested photo actually belongs to the visit for this
// token before serving it, so one token can never be used to guess/access
// another visit's photos.
share.get('/visit/:token/photo/:photoId', async (c) => {
  const token = c.req.param('token')
  const photoId = c.req.param('photoId')
  const { env } = c

  const visit = await env.DB.prepare('SELECT id FROM site_visits WHERE share_token = ?').bind(token).first() as any
  if (!visit) return c.notFound()

  const photo = await env.DB.prepare('SELECT r2_key FROM site_visit_photos WHERE id = ? AND visit_id = ?').bind(photoId, visit.id).first() as any
  if (!photo) return c.notFound()

  const object = await env.PHOTOS.get(photo.r2_key)
  if (!object) return c.notFound()

  return new Response(object.body, {
    headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' }
  })
})

export default share
