import { getCookie } from 'hono/cookie'

// Shared admin-session helper used by both /admin/leads and /admin/visits.
// Session cookie is a SHA-256 of the ADMIN_PASSWORD secret -- no extra
// KV/secret storage needed for this single-admin, read-mostly dashboard.

export const SESSION_COOKIE = 'michael_admin_session'

export async function sessionTokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode('michael-ai-admin:' + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function isAuthed(c: any): Promise<boolean> {
  const password = c.env.ADMIN_PASSWORD
  if (!password) return false
  const cookie = getCookie(c, SESSION_COOKIE)
  if (!cookie) return false
  const expected = await sessionTokenFor(password)
  return cookie === expected
}
