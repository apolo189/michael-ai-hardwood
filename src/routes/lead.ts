import { Hono } from 'hono'
import { sendLeadNotification } from '../lib/webhook'

type Bindings = {
  DB: D1Database
  WEB3FORMS_ACCESS_KEY: string
}

const lead = new Hono<{ Bindings: Bindings }>()

// Structured, compliance-safe lead submission (used by the "Schedule My Evaluation" form).
// This does NOT rely on the LLM deciding whether consent was given — the checkbox is a real
// UI element the user must check, matching Google Ads / TCPA requirements.
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
    estimateLow,
    estimateHigh,
    laborOnly,
    appointmentDayPref,
    appointmentWindow,
    photoUrls,
    conversationSummary,
    consentContact
  } = body

  if (!name || (!phone && !email)) {
    return c.json({ error: 'Name and at least one contact method (phone or email) are required.' }, 400)
  }

  if (!consentContact) {
    return c.json({ error: 'Contact consent is required to submit your request.' }, 400)
  }

  try {
    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, address, city, service, square_footage, finish_option, estimate_low, estimate_high, labor_only, appointment_day_pref, appointment_window, photos_json, conversation_summary, consent_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        estimateLow ?? null,
        estimateHigh ?? null,
        laborOnly ? 1 : 0,
        appointmentDayPref || null,
        appointmentWindow || null,
        JSON.stringify(photoUrls || []),
        conversationSummary || null,
        consentContact ? 1 : 0
      )
      .run()
  } catch (err) {
    console.error('DB insert error:', err)
  }

  const notifyResult = await sendLeadNotification(env.WEB3FORMS_ACCESS_KEY, {
    name,
    phone,
    email,
    address,
    city,
    service,
    squareFootage,
    finishOption,
    estimateLow,
    estimateHigh,
    laborOnly,
    appointmentDayPref,
    appointmentWindow,
    photoUrls,
    conversationSummary,
    consentContact
  })

  return c.json({ success: true, notified: notifyResult.ok, notifyError: notifyResult.error })
})

export default lead
