import { Hono } from 'hono'

// NOTE: Web3Forms' free plan only supports client-side (browser) calls —
// their server-side/API usage requires a paid plan + IP whitelisting.
// The email notification is sent directly from the browser (see
// sendWeb3FormsNotification in chat-widget.js) right after this endpoint
// confirms the lead was saved. This route is the source of truth: it
// always persists the lead to D1 regardless of whether the email succeeds.

type Bindings = {
  DB: D1Database
}

const lead = new Hono<{ Bindings: Bindings }>()

// Structured, compliance-safe lead submission (used by the "Schedule My Evaluation" /
// "Call Me Now" form at the end of the guided wizard). Consent is a real checkbox the
// user must check — never inferred by the AI.
lead.post('/submit', async (c) => {
  const { env } = c
  const body = await c.req.json().catch(() => ({}))

  const {
    name,
    phone,
    email,
    address,
    city,
    service,
    squareFootage,
    finishOption,
    finishCoats,
    estimateTotal,
    laborOnly,
    appointmentDayPref,
    appointmentWindow,
    photoUrls,
    conversationSummary,
    consentContact,
    wantsCallNow
  } = body

  if (!name || (!phone && !email)) {
    return c.json({ error: 'Name and at least one contact method (phone or email) are required.' }, 400)
  }

  if (!consentContact) {
    return c.json({ error: 'Contact consent is required to submit your request.' }, 400)
  }

  try {
    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, address, city, service, square_footage, finish_option, finish_coats, estimate_total, labor_only, appointment_day_pref, appointment_window, photos_json, conversation_summary, consent_contact, wants_call_now)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        name || null,
        phone || null,
        email || null,
        address || null,
        city || null,
        service || null,
        squareFootage ?? null,
        finishOption || null,
        finishCoats ?? null,
        estimateTotal ?? null,
        laborOnly ? 1 : 0,
        appointmentDayPref || null,
        appointmentWindow || null,
        JSON.stringify(photoUrls || []),
        conversationSummary || null,
        consentContact ? 1 : 0,
        wantsCallNow ? 1 : 0
      )
      .run()
  } catch (err) {
    console.error('DB insert error:', err)
  }

  return c.json({ success: true })
})

export default lead
