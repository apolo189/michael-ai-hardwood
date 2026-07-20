// ============================================================
// Web3Forms integration — sends lead notification emails.
// The Access Key is injected as a Cloudflare secret / .dev.vars
// value named WEB3FORMS_ACCESS_KEY. Never hardcode it.
// ============================================================

export interface LeadPayload {
  name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  service?: string
  squareFootage?: number
  finishOption?: string
  finishCoats?: number
  estimateTotal?: number | null
  laborOnly?: boolean
  appointmentDayPref?: string
  appointmentWindow?: string
  photoUrls?: string[]
  conversationSummary?: string
  consentContact?: boolean
  wantsCallNow?: boolean
}

export async function sendLeadNotification(accessKey: string, lead: LeadPayload): Promise<{ ok: boolean; error?: string }> {
  if (!accessKey) {
    return { ok: false, error: 'WEB3FORMS_ACCESS_KEY not configured' }
  }

  const estimateText =
    lead.estimateTotal != null
      ? `$${lead.estimateTotal}${lead.laborOnly ? ' (labor only, materials not included)' : ''}`
      : 'Requires in-person evaluation'

  const message = `
NEW HARDWOOD FLOORING LEAD

Customer Name: ${lead.name || 'N/A'}
Phone: ${lead.phone || 'N/A'}
Email: ${lead.email || 'N/A'}
Address: ${lead.address || 'N/A'}
City: ${lead.city || 'N/A'}

Service Selected: ${lead.service || 'N/A'}
Square Footage: ${lead.squareFootage ?? 'N/A'}
Finish Option: ${lead.finishOption || 'N/A'}${lead.finishCoats ? ` (${lead.finishCoats} coats)` : ''}
Estimated Investment: ${estimateText}

Preferred Appointment Day(s): ${lead.appointmentDayPref || 'N/A'}
Preferred Time Window: ${lead.appointmentWindow || 'N/A'}
Wants a call now: ${lead.wantsCallNow ? 'YES - call ASAP' : 'No, scheduled visit preferred'}

Photos: ${lead.photoUrls && lead.photoUrls.length ? lead.photoUrls.join(', ') : 'None uploaded'}

Contact Consent (TCPA): ${lead.consentContact ? 'YES - customer agreed to be contacted by phone/text' : 'NOT CONFIRMED'}

--- Conversation Summary ---
${lead.conversationSummary || 'N/A'}
`.trim()

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: '🔥 NEW HARDWOOD LEAD',
        from_name: 'Michael AI - Hardwood Flooring Assistant',
        name: lead.name || 'Website Lead',
        email: lead.email || 'noreply@michaelai-hardwood.com',
        phone: lead.phone || '',
        message
      })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.success === false) {
      return { ok: false, error: data?.message || `Web3Forms error (status ${res.status})` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unknown error sending lead notification' }
  }
}
