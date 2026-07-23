import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

// ---------------------------------------------------------------------------
// READ-ONLY admin dashboard for viewing leads saved in D1.
//
// IMPORTANT: This file is completely isolated from the lead-saving/email
// flow (src/routes/lead.ts + chat-widget.js). It only ever runs SELECT
// queries — it never INSERTs, UPDATEs, or DELETEs anything, and it is only
// reached when someone manually visits /admin and logs in with the
// password. Nothing here executes as part of a customer submitting the
// booking form.
//
// Auth approach: a plain HTML login form (not HTTP Basic Auth) — some
// mobile browsers / in-app browsers (e.g. opening a link from WhatsApp)
// don't reliably show the native Basic Auth prompt, which caused a
// persistent "Unauthorized" with no way to even type a password. A normal
// form + session cookie works consistently everywhere.
// ---------------------------------------------------------------------------

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD: string
}

const admin = new Hono<{ Bindings: Bindings }>()

const SESSION_COOKIE = 'michael_admin_session'

// Simple, non-secret-dependent session token derived from the password
// itself (no extra KV/secret needed) — good enough for a low-stakes,
// single-admin read-only dashboard behind HTTPS.
async function sessionTokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode('michael-ai-admin:' + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function loginPage(error?: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Michael AI — Admin Login</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
        <h1 class="text-xl font-bold text-gray-800 mb-1">🔒 Leads Dashboard</h1>
        <p class="text-sm text-gray-500 mb-6">Michael AI — Hardwood Flooring</p>
        ${error ? `<p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">${error}</p>` : ''}
        <form method="POST" action="/admin/login">
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" name="password" autofocus required
            class="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <button type="submit"
            class="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded">
            View Leads
          </button>
        </form>
      </div>
    </body>
    </html>
  `
}

async function isAuthed(c: any): Promise<boolean> {
  const password = c.env.ADMIN_PASSWORD
  if (!password) return false
  const cookie = getCookie(c, SESSION_COOKIE)
  if (!cookie) return false
  const expected = await sessionTokenFor(password)
  return cookie === expected
}

// GET /admin -> redirect to /admin/leads (convenience)
admin.get('/', (c) => c.redirect('/admin/leads'))

admin.get('/login', (c) => {
  return c.html(loginPage())
})

admin.post('/login', async (c) => {
  const password = c.env.ADMIN_PASSWORD
  if (!password) {
    return c.html(loginPage('Admin dashboard is not configured yet (missing ADMIN_PASSWORD).'), 503)
  }
  const body = await c.req.parseBody()
  const entered = String(body.password || '')
  if (entered !== password) {
    return c.html(loginPage('Incorrect password. Please try again.'), 401)
  }
  const token = await sessionTokenFor(password)
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/admin',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
  return c.redirect('/admin/leads')
})

admin.get('/leads', async (c) => {
  if (!(await isAuthed(c))) {
    return c.redirect('/admin/login')
  }

  const { env } = c
  const { results } = await env.DB.prepare(
    `SELECT id, name, phone, email, address, city, service, square_footage,
            finish_option, estimate_total, labor_only, appointment_day_pref,
            appointment_window, status, wants_call_now, created_at
     FROM leads
     ORDER BY created_at DESC
     LIMIT 200`
  ).all()

  const rows = (results || []) as any[]

  const rowsHtml = rows.map((r) => `
    <tr class="border-b border-gray-200 hover:bg-amber-50">
      <td class="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">${escapeHtml(r.created_at || '')}</td>
      <td class="px-3 py-2 text-sm font-semibold text-gray-800 whitespace-nowrap">${escapeHtml(r.name || '-')}</td>
      <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
        ${r.phone ? `<a class="text-blue-600 hover:underline" href="tel:${escapeHtml(r.phone)}">${escapeHtml(r.phone)}</a>` : '-'}
      </td>
      <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
        ${r.email ? `<a class="text-blue-600 hover:underline" href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a>` : '-'}
      </td>
      <td class="px-3 py-2 text-sm text-gray-700">${escapeHtml(r.address || '')} ${escapeHtml(r.city || '')}</td>
      <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${escapeHtml(r.service || '-')}</td>
      <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${r.square_footage ?? '-'}</td>
      <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${r.estimate_total != null ? '$' + Number(r.estimate_total).toLocaleString() : '-'}</td>
      <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${escapeHtml(r.appointment_day_pref || '-')} ${escapeHtml(r.appointment_window || '')}</td>
      <td class="px-3 py-2 text-sm whitespace-nowrap">
        ${r.wants_call_now ? '<span class="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">📞 CALL NOW</span>' : ''}
      </td>
      <td class="px-3 py-2 text-sm whitespace-nowrap">
        <span class="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">${escapeHtml(r.status || 'new')}</span>
      </td>
    </tr>
  `).join('')

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Michael AI — Leads Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      <meta http-equiv="refresh" content="60">
    </head>
    <body class="bg-gray-100 min-h-screen p-4 md:p-8">
      <div class="max-w-7xl mx-auto">
        <header class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-list-check text-amber-600 mr-2"></i>
            Leads — Michael AI Hardwood
          </h1>
          <div class="text-sm text-gray-500">
            <i class="fas fa-rotate mr-1"></i> Auto-refreshes every 60s &middot; Showing latest ${rows.length} lead(s)
          </div>
        </header>

        <div class="bg-white rounded-lg shadow overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Address</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sq Ft</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Estimate</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Preferred Time</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="11" class="px-3 py-8 text-center text-gray-400">No leads yet.</td></tr>`}
            </tbody>
          </table>
        </div>

        <p class="text-xs text-gray-400 mt-4">
          This page is read-only and completely separate from the booking form / email notification system.
          It always reflects exactly what is saved in the database.
        </p>
      </div>
    </body>
    </html>
  `)
})

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default admin
