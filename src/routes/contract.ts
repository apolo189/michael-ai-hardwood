import { Hono } from 'hono'
import { isAuthed } from '../lib/adminAuth'
import { escapeHtml } from './visits'

// ---------------------------------------------------------------------------
// Signable Contracts / Estimates — /admin/visits/:id/contract (create, admin
// only) and /firmar/:token (public, no-login signing page for the client).
//
// Flow:
//  1. Luis is on a Site Visit detail page after quoting a client in person.
//     He taps "Send Contract to Sign" -> a `contracts` row is created as a
//     frozen SNAPSHOT of that visit's client/price/services/start-date.
//  2. Luis gets a link (/firmar/:token) to open on HIS phone and hand to
//     the client right there, or send via WhatsApp/SMS if he leaves first.
//  3. The client reviews the summary + terms and signs with a finger on a
//     <canvas> pad. On submit we store the signature PNG, timestamp, and
//     the request's IP address as basic proof of acceptance (ESIGN Act —
//     simple e-signatures are generally valid for service contracts, but
//     this is not legal advice).
//  4. Luis is notified (existing Web3Forms browser-side notification,
//     same mechanism used for new leads) and the client sees a "Send me a
//     copy by email" button that opens their own mail app pre-filled with
//     the signed terms (no server-side email account needed).
//
// Isolated from /admin/visits CRUD — only reads a site_visits row to build
// the snapshot; never writes back to site_visits.
// ---------------------------------------------------------------------------

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD: string
  WEB3FORMS_ACCESS_KEY: string
}

// Two separate Hono instances mounted at two different base paths in
// index.tsx: `contractAdmin` under /admin/visits (password-protected,
// creates the snapshot) and `contractPublic` under /firmar (no login,
// client-facing signing page). Kept in one file since they share helpers
// and both operate on the same `contracts` table.
const contractAdmin = new Hono<{ Bindings: Bindings }>()
const contractPublic = new Hono<{ Bindings: Bindings }>()

const DEFAULT_DEPOSIT_PERCENT = 30

const DEFAULT_TERMS = `1. This estimate becomes a binding work agreement once signed below and the deposit is received.
2. A deposit of {DEPOSIT_PERCENT}% (${'$'}{DEPOSIT_AMOUNT}) is due before work is scheduled. The remaining balance is due upon completion.
3. The price above is based on the conditions observed during the in-person visit. Any changes requested after work begins (additional square footage, material changes, or hidden subfloor damage discovered once demo starts) may adjust the final price — the client will always be informed and asked to approve any change before it is charged.
4. Estimated start date is approximate and may shift due to material delivery or weather; the client will be notified of any change.
5. Cancellations within 48 hours of the scheduled start date may forfeit the deposit to cover reserved materials/labor.
By signing below, the client confirms they have reviewed and agree to the price, scope of work, and terms above, and authorize Westchester Hardwood Experts to proceed.`

function pageShell(title: string, body: string, web3formsKey: string = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
  ${body}
  <script>window.__WEB3FORMS_ACCESS_KEY = ${JSON.stringify(web3formsKey || '')};</script>
</body>
</html>`
}

async function requireAuth(c: any) {
  if (!(await isAuthed(c))) return c.redirect('/admin/login')
  return null
}

// ---------------------------------------------------------------------------
// ADMIN — create a contract snapshot from a visit, then show the shareable
// link. Mounted at /admin/visits/:id/contract inside index.tsx.
// ---------------------------------------------------------------------------
contractAdmin.post('/:id/contract', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const { env } = c
  const visitId = c.req.param('id')
  const visit = await env.DB.prepare('SELECT * FROM site_visits WHERE id = ?').bind(visitId).first() as any
  if (!visit) return c.text('Visit not found', 404)

  const body = await c.req.parseBody().catch(() => ({} as any))
  const depositPercent = parseInt(String(body.deposit_percent || DEFAULT_DEPOSIT_PERCENT), 10) || DEFAULT_DEPOSIT_PERCENT

  const SERVICE_LABELS: Record<string, string> = {
    sanding_natural: 'Sanding & Refinishing (Natural)',
    sanding_stain: 'Sanding & Refinishing (Custom Stain)',
    hardwood_install: 'New Hardwood Installation',
    repair: 'Repair Hardwood Floors',
    other: 'Other'
  }
  let services: string[] = []
  try { services = JSON.parse(visit.services_json || '[]') } catch {}
  const servicesText = services.map((s) => SERVICE_LABELS[s] || s).join(', ') || (visit.free_notes || 'Hardwood flooring services')

  const totalPrice = visit.final_price != null ? Number(visit.final_price) : (visit.quoted_estimate != null ? Number(visit.quoted_estimate) : null)
  if (totalPrice == null) {
    return c.text('This visit has no Final Price (or Quoted Estimate) set yet. Go back and add a price under "Pricing & Notes" before sending a contract.', 400)
  }
  const depositAmount = Math.round((totalPrice * depositPercent) / 100)

  const termsText = DEFAULT_TERMS
    .replace('{DEPOSIT_PERCENT}', String(depositPercent))
    .replace('{DEPOSIT_AMOUNT}', depositAmount.toLocaleString())

  const token = crypto.randomUUID().replace(/-/g, '')

  await env.DB.prepare(`
    INSERT INTO contracts (
      visit_id, contract_token, client_name, address, city, phone, email,
      services_text, total_square_footage, total_price, deposit_percent,
      deposit_amount, target_start_date, terms_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    visit.id, token, visit.client_name || null, visit.address || null, visit.city || null,
    visit.phone || null, visit.email || null, servicesText, visit.total_square_footage ?? null,
    totalPrice, depositPercent, depositAmount, visit.target_start_date || null, termsText
  ).run()

  return c.redirect(`/admin/visits/${visitId}`)
})

// ---------------------------------------------------------------------------
// PUBLIC — the signing page itself. No login. Scoped by unguessable token.
// ---------------------------------------------------------------------------
contractPublic.get('/:token', async (c) => {
  const token = c.req.param('token')
  const { env } = c
  const row = await env.DB.prepare('SELECT * FROM contracts WHERE contract_token = ?').bind(token).first() as any
  if (!row) return c.html(pageShell('Link Not Found', `<div class="max-w-md mx-auto mt-24 text-center px-4"><i class="fas fa-triangle-exclamation text-4xl text-amber-500 mb-4"></i><p class="text-gray-600">This contract link is invalid or has expired. Please contact Westchester Hardwood Experts for a new link.</p></div>`), 404)

  if (row.status === 'signed') {
    // The `just_signed=1` query param is only present on the ONE-TIME
    // redirect that immediately follows a successful signature submission
    // (see the fetch() success handler in signingPageBody below) — it's how
    // we notify Luis exactly once, from the client's own browser, using the
    // same Web3Forms mechanism already used for new-lead notifications.
    // Re-opening this same /firmar/:token link later (already signed) never
    // includes this param, so it never re-sends the notification.
    const justSigned = c.req.query('just_signed') === '1'
    return c.html(pageShell('Signed — Westchester Hardwood Experts', signedConfirmationBody(row, justSigned), env.WEB3FORMS_ACCESS_KEY))
  }

  return c.html(pageShell(`Estimate for ${row.client_name || 'Review'} — Westchester Hardwood Experts`, signingPageBody(row, token)))
})

// ---------------------------------------------------------------------------
// PUBLIC — submit the signature. No login. Scoped by unguessable token.
// ---------------------------------------------------------------------------
contractPublic.post('/:token', async (c) => {
  const token = c.req.param('token')
  const { env } = c
  const row = await env.DB.prepare('SELECT * FROM contracts WHERE contract_token = ?').bind(token).first() as any
  if (!row) return c.json({ error: 'not_found' }, 404)
  if (row.status === 'signed') return c.json({ error: 'already_signed' }, 409)

  const body = await c.req.json().catch(() => ({} as any))
  const signerName = String(body.signerName || '').trim()
  const signatureData = String(body.signatureData || '')
  if (!signerName || !signatureData.startsWith('data:image/png;base64,')) {
    return c.json({ error: 'missing_signature' }, 400)
  }

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown'
  const signedAt = new Date().toISOString()

  await env.DB.prepare(`
    UPDATE contracts SET status = 'signed', signer_name = ?, signature_data = ?, signed_at = ?, signer_ip = ?
    WHERE contract_token = ?
  `).bind(signerName, signatureData, signedAt, ip, token).run()

  return c.json({ success: true })
})

function money(n: any) {
  return n == null ? '—' : '$' + Number(n).toLocaleString()
}

function signingPageBody(row: any, token: string) {
  return `
  <div class="max-w-lg mx-auto px-4 py-6 pb-10">
    <div class="text-center mb-6">
      <i class="fas fa-tree text-amber-600 text-3xl mb-2"></i>
      <h1 class="font-bold text-xl text-gray-800">Westchester Hardwood Experts</h1>
      <p class="text-sm text-gray-500">Estimate & Work Agreement</p>
    </div>

    <div class="bg-white rounded-xl shadow p-5 mb-4">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-user text-amber-600 mr-2"></i>Client</h2>
      <dl class="text-sm space-y-1 text-gray-700">
        <div><span class="text-gray-500">Name:</span> ${escapeHtml(row.client_name || '—')}</div>
        <div><span class="text-gray-500">Address:</span> ${escapeHtml(row.address || '—')} ${escapeHtml(row.city || '')}</div>
      </dl>
    </div>

    <div class="bg-white rounded-xl shadow p-5 mb-4">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-hammer text-amber-600 mr-2"></i>Scope of Work</h2>
      <dl class="text-sm space-y-1 text-gray-700">
        <div><span class="text-gray-500">Service(s):</span> ${escapeHtml(row.services_text || '—')}</div>
        <div><span class="text-gray-500">Total Sq Ft:</span> ${row.total_square_footage ?? '—'}</div>
        <div><span class="text-gray-500">Estimated Start:</span> ${escapeHtml(row.target_start_date || 'To be scheduled')}</div>
      </dl>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-dollar-sign text-amber-600 mr-2"></i>Price & Deposit</h2>
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-gray-600">Total Price</span>
        <span class="font-bold text-lg text-gray-900">${money(row.total_price)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Deposit Due (${row.deposit_percent}%)</span>
        <span class="font-semibold text-amber-700">${money(row.deposit_amount)}</span>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow p-5 mb-4">
      <h2 class="font-bold text-gray-800 mb-2"><i class="fas fa-file-contract text-amber-600 mr-2"></i>Terms</h2>
      <p class="text-xs text-gray-600 whitespace-pre-line leading-relaxed">${escapeHtml(row.terms_text || '')}</p>
    </div>

    <div class="bg-white rounded-xl shadow p-5">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-signature text-amber-600 mr-2"></i>Sign to Accept</h2>

      <label class="block text-xs text-gray-500 mb-1">Full Name</label>
      <input id="signerName" type="text" placeholder="Type your full name" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 mb-4 text-base" autocomplete="name">

      <label class="block text-xs text-gray-500 mb-1">Sign with your finger below</label>
      <div class="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative">
        <canvas id="sigPad" style="height:180px; display:block; width:100%; touch-action:none;"></canvas>
        <button id="clearSig" type="button" class="absolute top-2 right-2 text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-500"><i class="fas fa-eraser mr-1"></i>Clear</button>
      </div>

      <p class="text-[11px] text-gray-400 mt-2 leading-relaxed">By signing, you confirm you have read and agree to the price, scope of work, and terms above. Your signature, name, timestamp, and IP address are recorded as proof of acceptance.</p>

      <button id="submitBtn" disabled class="w-full bg-gray-300 text-gray-500 font-bold py-3.5 rounded-xl mt-4 transition">
        <i class="fas fa-check mr-1"></i> Confirm & Sign
      </button>
      <p id="errMsg" class="text-red-600 text-sm mt-2 hidden"></p>
    </div>
  </div>

  <script>
    (function () {
      var canvas = document.getElementById('sigPad');
      var ctx = canvas.getContext('2d');
      var drawing = false;
      var lastX = 0, lastY = 0;
      // Store every stroke as an array of points (in CSS pixels, not device
      // pixels) so the drawing can be redrawn if the canvas is ever resized
      // (e.g. mobile browser hides/shows its address bar on scroll, or the
      // on-screen keyboard opens/closes) — this was previously WIPING the
      // signature silently because the canvas backing store was recreated
      // on every 'resize' event without redrawing what was already drawn,
      // which is why the line looked faint/cut-off and sometimes the
      // signature that got submitted was blank.
      var strokes = [];
      var currentStroke = null;

      function sizeCanvas() {
        var ratio = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        var cssWidth = rect.width;
        var cssHeight = rect.height;
        canvas.width = Math.round(cssWidth * ratio);
        canvas.height = Math.round(cssHeight * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        redrawAll();
      }

      function redrawAll() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var s = 0; s < strokes.length; s++) {
          var pts = strokes[s];
          if (pts.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }
      }

      sizeCanvas();
      // Debounced resize handler — mobile browsers fire many resize/scroll
      // events; redrawing is cheap but we still avoid doing it excessively.
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sizeCanvas, 150);
      });

      function pos(e) {
        var rect = canvas.getBoundingClientRect();
        var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      function start(e) {
        drawing = true;
        var p = pos(e);
        lastX = p.x; lastY = p.y;
        currentStroke = [p];
        strokes.push(currentStroke);
        e.preventDefault();
      }
      function move(e) {
        if (!drawing) return;
        var p = pos(e);
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
        lastX = p.x; lastY = p.y;
        currentStroke.push(p);
        updateBtn();
        e.preventDefault();
      }
      function end(e) { drawing = false; currentStroke = null; if (e) e.preventDefault(); }

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end, { passive: false });
      canvas.addEventListener('touchcancel', end, { passive: false });

      document.getElementById('clearSig').addEventListener('click', function () {
        strokes = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateBtn();
      });

      function hasSignature() {
        for (var i = 0; i < strokes.length; i++) if (strokes[i].length > 1) return true;
        return false;
      }

      var nameInput = document.getElementById('signerName');
      var submitBtn = document.getElementById('submitBtn');
      function updateBtn() {
        var ok = hasSignature() && nameInput.value.trim().length > 1;
        submitBtn.disabled = !ok;
        submitBtn.className = ok
          ? 'w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl mt-4 transition'
          : 'w-full bg-gray-300 text-gray-500 font-bold py-3.5 rounded-xl mt-4 transition';
      }
      nameInput.addEventListener('input', updateBtn);

      submitBtn.addEventListener('click', async function () {
        var errMsg = document.getElementById('errMsg');
        errMsg.classList.add('hidden');
        if (!hasSignature()) {
          errMsg.textContent = 'Please draw your signature above before submitting.';
          errMsg.classList.remove('hidden');
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        try {
          var res = await fetch(window.location.pathname, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signerName: nameInput.value.trim(), signatureData: canvas.toDataURL('image/png') })
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok || !data.success) throw new Error((data && data.error) || ('http_' + res.status));
          // just_signed=1 tells the confirmation page (reloaded below) to
          // notify Luis this ONE time via the client's own browser.
          window.location.href = window.location.pathname + '?just_signed=1';
        } catch (err) {
          errMsg.textContent = 'Something went wrong sending your signature. Please check your internet connection and try again.';
          errMsg.classList.remove('hidden');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm & Sign';
          updateBtn();
        }
      });
    })();
  </script>
  `
}

function signedConfirmationBody(row: any, justSigned: boolean = false) {
  const emailSubject = encodeURIComponent('Signed Estimate — Westchester Hardwood Experts')
  const emailBody = encodeURIComponent(
    `Signed estimate confirmation\n\nClient: ${row.client_name || ''}\nAddress: ${row.address || ''} ${row.city || ''}\nService(s): ${row.services_text || ''}\nTotal Price: ${money(row.total_price)}\nDeposit (${row.deposit_percent}%): ${money(row.deposit_amount)}\nEstimated Start: ${row.target_start_date || 'To be scheduled'}\nSigned by: ${row.signer_name || ''}\nSigned at: ${row.signed_at || ''}\n\nTerms:\n${row.terms_text || ''}`
  )

  // Data used ONLY by the one-time notify script below (never rendered as
  // visible text) — kept as a separate JSON blob so we don't have to worry
  // about escaping inside a JS template literal.
  const notifyPayload = JSON.stringify({
    clientName: row.client_name || '',
    address: row.address || '',
    city: row.city || '',
    phone: row.phone || '',
    email: row.email || '',
    services: row.services_text || '',
    totalPrice: row.total_price,
    depositPercent: row.deposit_percent,
    depositAmount: row.deposit_amount,
    startDate: row.target_start_date || '',
    signerName: row.signer_name || '',
    signedAt: row.signed_at || ''
  })

  return `
  <div class="max-w-lg mx-auto px-4 py-10 text-center">
    <i class="fas fa-circle-check text-green-500 text-5xl mb-4"></i>
    <h1 class="font-bold text-xl text-gray-800 mb-1">Signed successfully!</h1>
    <p class="text-gray-500 text-sm mb-6">Thank you, ${escapeHtml(row.signer_name || '')}. Westchester Hardwood Experts has been notified and will be in touch to schedule your start date.</p>

    <div class="bg-white rounded-xl shadow p-5 text-left mb-4">
      <dl class="text-sm space-y-1 text-gray-700">
        <div><span class="text-gray-500">Total Price:</span> <strong>${money(row.total_price)}</strong></div>
        <div><span class="text-gray-500">Deposit (${row.deposit_percent}%):</span> ${money(row.deposit_amount)}</div>
        <div><span class="text-gray-500">Signed:</span> ${escapeHtml(row.signed_at || '')}</div>
      </dl>
      ${row.signature_data ? `<img src="${row.signature_data}" alt="Signature" class="mt-3 border border-gray-200 rounded h-20">` : ''}
    </div>

    <a href="mailto:${escapeHtml(row.email || '')}?subject=${emailSubject}&body=${emailBody}" class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-3 rounded-xl">
      <i class="fas fa-envelope"></i> Send me a copy by email
    </a>
  </div>

  ${justSigned ? `
  <script>
    // Fire-and-forget: notify Luis using the SAME mechanism already used
    // for new-lead emails (Web3Forms free plan — client-side only, no
    // server email account needed). Runs ONCE, only right after a
    // successful signature (see just_signed=1 handling), never again if
    // this page is reopened later.
    (function () {
      var accessKey = window.__WEB3FORMS_ACCESS_KEY;
      if (!accessKey) return;
      var d = ${notifyPayload};
      var message = [
        'CONTRACT SIGNED — ' + (d.clientName || 'Client'),
        '',
        'Client: ' + (d.clientName || 'N/A'),
        'Phone: ' + (d.phone || 'N/A'),
        'Email: ' + (d.email || 'N/A'),
        'Address: ' + (d.address || 'N/A') + ' ' + (d.city || ''),
        '',
        'Service(s): ' + (d.services || 'N/A'),
        'Total Price: ' + (d.totalPrice != null ? '$' + d.totalPrice : 'N/A'),
        'Deposit (' + d.depositPercent + '%): ' + (d.depositAmount != null ? '$' + d.depositAmount : 'N/A'),
        'Estimated Start: ' + (d.startDate || 'To be scheduled'),
        '',
        'Signed by: ' + (d.signerName || 'N/A'),
        'Signed at: ' + (d.signedAt || 'N/A')
      ].join('\\n');

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          access_key: accessKey,
          subject: '✅ CONTRACT SIGNED — ' + (d.clientName || 'Client'),
          from_name: 'Michael AI - Signed Contract Notification',
          name: d.clientName || 'Client',
          email: d.email || 'noreply@michaelai-hardwood.com',
          phone: d.phone || '',
          message: message
        })
      }).catch(function () {});

      // Clean the URL so refreshing/reopening this page never re-fires
      // the notification.
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    })();
  </script>
  ` : ''}
  `
}

export { contractAdmin, contractPublic, signedConfirmationBody }
