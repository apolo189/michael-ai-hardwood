import { Hono } from 'hono'
import { isAuthed } from '../lib/adminAuth'
import { adminNav } from './admin'

// ---------------------------------------------------------------------------
// Site Visit Notes — field measurements + photos for subcontractor handoff.
//
// Completely separate table (site_visits / site_visit_rooms /
// site_visit_photos) from `leads`. A visit MAY optionally link to a lead_id,
// but creating/editing a visit never touches the leads table, the booking
// form, or the email-notification flow.
//
// Two access modes:
//  - /admin/visits/*      -> password-protected (Luis only), full CRUD
//  - /share/visit/:token  -> public, read-only, no login (for WhatsApp to
//                            the subcontractor) — mounted separately in
//                            index.tsx at a path outside /admin.
// ---------------------------------------------------------------------------

type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  ADMIN_PASSWORD: string
}

const visits = new Hono<{ Bindings: Bindings }>()

const SERVICE_OPTIONS: Record<string, string> = {
  sanding_natural: 'Sanding & Refinishing (Natural)',
  sanding_stain: 'Sanding & Refinishing (Custom Stain)',
  hardwood_install: 'New Hardwood Installation',
  repair: 'Repair Hardwood Floors',
  other: 'Other'
}

const FLOOR_TYPES = ['hardwood', 'laminate', 'carpet', 'tile', 'concrete', 'other']
const CONDITIONS = ['good', 'fair', 'damaged', 'water_damage', 'pet_damage']
const INTEREST_LEVELS = ['hot', 'warm', 'cold']
const NEXT_STEPS = ['send_estimate', 'client_thinking', 'schedule_start', 'other']

function escapeHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function pageShell(title: string, body: string, extraHead: string = '') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      ${extraHead}
    </head>
    <body class="bg-gray-100 min-h-screen p-4 md:p-8">
      <div class="max-w-5xl mx-auto">
        ${body}
      </div>
    </body>
    </html>
  `
}

async function requireAuth(c: any) {
  if (!(await isAuthed(c))) {
    return c.redirect('/admin/login')
  }
  return null
}

// ---------------------------------------------------------------------------
// LIST — /admin/visits
// ---------------------------------------------------------------------------
visits.get('/', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const { env } = c
  const { results } = await env.DB.prepare(
    `SELECT id, client_name, address, city, visit_date, services_json,
            total_square_footage, final_price, interest_level, next_step, created_at
     FROM site_visits
     ORDER BY created_at DESC
     LIMIT 200`
  ).all()

  const rows = (results || []) as any[]

  const interestBadge = (level: string) => {
    if (level === 'hot') return '<span class="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">🔥 Hot</span>'
    if (level === 'warm') return '<span class="inline-block bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded">🌤 Warm</span>'
    if (level === 'cold') return '<span class="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">❄️ Cold</span>'
    return '-'
  }

  const rowsHtml = rows.map((r) => {
    let services: string[] = []
    try { services = JSON.parse(r.services_json || '[]') } catch {}
    const serviceLabel = services.map((s) => SERVICE_OPTIONS[s] || s).join(', ') || '-'
    return `
      <tr class="border-b border-gray-200 hover:bg-amber-50 cursor-pointer" onclick="window.location='/admin/visits/${r.id}'">
        <td class="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">${escapeHtml(r.visit_date || r.created_at || '')}</td>
        <td class="px-3 py-2 text-sm font-semibold text-gray-800 whitespace-nowrap">${escapeHtml(r.client_name || '-')}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${escapeHtml(r.address || '')} ${escapeHtml(r.city || '')}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${escapeHtml(serviceLabel)}</td>
        <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${r.total_square_footage ?? '-'}</td>
        <td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${r.final_price != null ? '$' + Number(r.final_price).toLocaleString() : '-'}</td>
        <td class="px-3 py-2 text-sm whitespace-nowrap">${interestBadge(r.interest_level)}</td>
        <td class="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">${escapeHtml((r.next_step || '').replace(/_/g, ' '))}</td>
      </tr>
    `
  }).join('')

  const body = `
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800">
        <i class="fas fa-clipboard-list text-amber-600 mr-2"></i>
        Michael AI — Admin
      </h1>
      <a href="/admin/visits/new" class="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded text-sm">
        <i class="fas fa-plus mr-1"></i> New Visit
      </a>
    </header>
    ${adminNav('visits')}
    <div class="bg-white rounded-lg shadow overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Address</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sq Ft</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Final Price</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Interest</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Next Step</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="8" class="px-3 py-8 text-center text-gray-400">No site visits yet. Click "New Visit" to add one.</td></tr>`}
        </tbody>
      </table>
    </div>
  `

  return c.html(pageShell('Michael AI — Site Visits', body))
})

// ---------------------------------------------------------------------------
// NEW / EDIT FORM — /admin/visits/new  and  /admin/visits/:id/edit
// ---------------------------------------------------------------------------
function visitFormPage(visit: any = {}, rooms: any[] = [], isEdit = false) {
  const serviceCheckboxes = Object.entries(SERVICE_OPTIONS).map(([key, label]) => {
    const checked = (visit.services || []).includes(key) ? 'checked' : ''
    return `
      <label class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-2 cursor-pointer hover:bg-amber-50">
        <input type="checkbox" name="services" value="${key}" ${checked} class="w-4 h-4" onchange="toggleServiceExtras()">
        <span class="text-sm">${label}</span>
      </label>
    `
  }).join('')

  const roomsHtml = (rooms.length ? rooms : [{}]).map((r, i) => roomRowHtml(r, i)).join('')

  return `
    <form id="visitForm" method="POST" action="${isEdit ? `/admin/visits/${visit.id}` : '/admin/visits/new'}" class="space-y-6">

      <!-- Section 1: Client & Property -->
      <section class="bg-white rounded-lg shadow p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-user text-amber-600 mr-2"></i>Client & Property</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input type="text" name="client_name" value="${escapeHtml(visit.client_name)}" class="w-full border border-gray-300 rounded px-3 py-2" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="text" name="phone" value="${escapeHtml(visit.phone)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value="${escapeHtml(visit.email)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select name="property_type" class="w-full border border-gray-300 rounded px-3 py-2">
              ${['house', 'apartment', 'condo', 'commercial'].map((v) => `<option value="${v}" ${visit.property_type === v ? 'selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" name="address" value="${escapeHtml(visit.address)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" name="city" value="${escapeHtml(visit.city)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
            <input type="date" name="visit_date" value="${escapeHtml(visit.visit_date)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
        </div>
      </section>

      <!-- Section 2: Services -->
      <section class="bg-white rounded-lg shadow p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-hammer text-amber-600 mr-2"></i>Service(s) Requested</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">${serviceCheckboxes}</div>
        <div id="stainExtras" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style="display:none">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stain Color</label>
            <input type="text" name="stain_color" value="${escapeHtml(visit.stain_color)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Finish Coats</label>
            <select name="finish_coats" class="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">-</option>
              <option value="2" ${visit.finish_coats == 2 ? 'selected' : ''}>2 coats</option>
              <option value="3" ${visit.finish_coats == 3 ? 'selected' : ''}>3 coats</option>
            </select>
          </div>
        </div>
        <div id="installExtras" class="grid grid-cols-1 md:grid-cols-2 gap-4" style="display:none">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Install Type</label>
            <select name="install_type" class="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">-</option>
              <option value="red_oak" ${visit.install_type === 'red_oak' ? 'selected' : ''}>Red Oak</option>
              <option value="prefinished" ${visit.install_type === 'prefinished' ? 'selected' : ''}>Prefinished</option>
              <option value="laminate" ${visit.install_type === 'laminate' ? 'selected' : ''}>Pergo/Laminate</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Section 3: Rooms / Measurements -->
      <section class="bg-white rounded-lg shadow p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800"><i class="fas fa-ruler-combined text-amber-600 mr-2"></i>Rooms & Measurements</h2>
          <div class="text-sm font-semibold text-gray-600">Total: <span id="totalSqFt">0</span> sq ft</div>
        </div>
        <div id="roomsContainer" class="space-y-3">${roomsHtml}</div>
        <button type="button" onclick="addRoom()" class="mt-3 text-sm text-amber-700 font-semibold hover:text-amber-800">
          <i class="fas fa-plus mr-1"></i> Add Room
        </button>
      </section>

      <!-- Section 4: Site Details -->
      <section class="bg-white rounded-lg shadow p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-house-circle-check text-amber-600 mr-2"></i>Site Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center gap-2">
            <input type="checkbox" name="has_stairs" id="has_stairs" ${visit.has_stairs ? 'checked' : ''} class="w-4 h-4">
            <label for="has_stairs" class="text-sm font-medium text-gray-700">Has stairs</label>
            <input type="number" name="stairs_count" value="${escapeHtml(visit.stairs_count)}" placeholder="# of stairs" class="border border-gray-300 rounded px-2 py-1 w-28 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Access Difficulty</label>
            <select name="access_difficulty" class="w-full border border-gray-300 rounded px-3 py-2">
              ${['easy', 'moderate', 'difficult'].map((v) => `<option value="${v}" ${visit.access_difficulty === v ? 'selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Furniture Moving</label>
            <select name="furniture_moving" class="w-full border border-gray-300 rounded px-3 py-2">
              <option value="client_does_it" ${visit.furniture_moving === 'client_does_it' ? 'selected' : ''}>Client does it</option>
              <option value="needs_help" ${visit.furniture_moving === 'needs_help' ? 'selected' : ''}>Needs help</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" name="has_pets" id="has_pets" ${visit.has_pets ? 'checked' : ''} class="w-4 h-4">
            <label for="has_pets" class="text-sm font-medium text-gray-700">Pets in the house</label>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Subfloor Condition</label>
            <input type="text" name="subfloor_condition" value="${escapeHtml(visit.subfloor_condition)}" placeholder="e.g. level, some moisture near kitchen" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Color Match Notes</label>
            <input type="text" name="color_match_notes" value="${escapeHtml(visit.color_match_notes)}" placeholder="e.g. matching hallway red oak stain" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
        </div>
      </section>

      <!-- Section 5: Pricing & Closing -->
      <section class="bg-white rounded-lg shadow p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-dollar-sign text-amber-600 mr-2"></i>Pricing & Notes</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Quoted Estimate (from chat, if any)</label>
            <input type="number" step="0.01" name="quoted_estimate" value="${escapeHtml(visit.quoted_estimate)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Final Price (in-person)</label>
            <input type="number" step="0.01" name="final_price" value="${escapeHtml(visit.final_price)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Pricing Notes</label>
            <input type="text" name="pricing_notes" value="${escapeHtml(visit.pricing_notes)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Target Start Date</label>
            <input type="date" name="target_start_date" value="${escapeHtml(visit.target_start_date)}" class="w-full border border-gray-300 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
            <select name="interest_level" class="w-full border border-gray-300 rounded px-3 py-2">
              <option value="hot" ${visit.interest_level === 'hot' ? 'selected' : ''}>🔥 Hot</option>
              <option value="warm" ${visit.interest_level === 'warm' ? 'selected' : ''}>🌤 Warm</option>
              <option value="cold" ${visit.interest_level === 'cold' ? 'selected' : ''}>❄️ Cold</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Next Step</label>
            <select name="next_step" class="w-full border border-gray-300 rounded px-3 py-2">
              <option value="send_estimate" ${visit.next_step === 'send_estimate' ? 'selected' : ''}>Send formal estimate</option>
              <option value="client_thinking" ${visit.next_step === 'client_thinking' ? 'selected' : ''}>Client is thinking it over</option>
              <option value="schedule_start" ${visit.next_step === 'schedule_start' ? 'selected' : ''}>Schedule start date</option>
              <option value="other" ${visit.next_step === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Free Notes</label>
            <textarea name="free_notes" rows="3" class="w-full border border-gray-300 rounded px-3 py-2">${escapeHtml(visit.free_notes)}</textarea>
          </div>
        </div>
      </section>

      <div class="flex justify-end gap-3">
        <a href="${isEdit ? `/admin/visits/${visit.id}` : '/admin/visits'}" class="px-5 py-2 rounded border border-gray-300 text-gray-600 font-semibold">Cancel</a>
        <button type="submit" class="px-5 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold">
          <i class="fas fa-save mr-1"></i> ${isEdit ? 'Save Changes' : 'Create Visit'}
        </button>
      </div>
    </form>

    <script>
      function roomTemplate(room, idx) {
        room = room || {};
        return \`
          <div class="room-row grid grid-cols-2 md:grid-cols-6 gap-2 items-end bg-gray-50 border border-gray-200 rounded p-3">
            <input type="text" name="room_name" placeholder="Room name" value="\${room.room_name || ''}" class="border border-gray-300 rounded px-2 py-1 text-sm col-span-2 md:col-span-1">
            <input type="number" step="0.1" name="room_length" placeholder="Length ft" value="\${room.length_ft || ''}" class="border border-gray-300 rounded px-2 py-1 text-sm" oninput="recalcRoom(this)">
            <input type="number" step="0.1" name="room_width" placeholder="Width ft" value="\${room.width_ft || ''}" class="border border-gray-300 rounded px-2 py-1 text-sm" oninput="recalcRoom(this)">
            <input type="number" step="0.1" name="room_sqft" placeholder="Sq Ft" value="\${room.square_footage || ''}" class="border border-gray-300 rounded px-2 py-1 text-sm font-semibold" oninput="recalcTotal()">
            <select name="room_floor_type" class="border border-gray-300 rounded px-2 py-1 text-sm">
              \${${JSON.stringify(FLOOR_TYPES)}.map(ft => \`<option value="\${ft}" \${room.current_floor_type === ft ? 'selected' : ''}>\${ft}</option>\`).join('')}
            </select>
            <select name="room_condition" class="border border-gray-300 rounded px-2 py-1 text-sm">
              \${${JSON.stringify(CONDITIONS)}.map(cd => \`<option value="\${cd}" \${room.condition === cd ? 'selected' : ''}>\${cd.replace(/_/g,' ')}</option>\`).join('')}
            </select>
            <input type="text" name="room_notes" placeholder="Notes" value="\${room.notes || ''}" class="border border-gray-300 rounded px-2 py-1 text-sm col-span-2 md:col-span-5">
            <button type="button" onclick="this.closest('.room-row').remove(); recalcTotal();" class="text-red-500 text-sm hover:text-red-700"><i class="fas fa-trash"></i></button>
          </div>
        \`;
      }
      function addRoom() {
        document.getElementById('roomsContainer').insertAdjacentHTML('beforeend', roomTemplate());
      }
      function recalcRoom(el) {
        const row = el.closest('.room-row');
        const len = parseFloat(row.querySelector('[name="room_length"]').value) || 0;
        const wid = parseFloat(row.querySelector('[name="room_width"]').value) || 0;
        if (len && wid) {
          row.querySelector('[name="room_sqft"]').value = (len * wid).toFixed(1);
        }
        recalcTotal();
      }
      function recalcTotal() {
        const sqftInputs = document.querySelectorAll('[name="room_sqft"]');
        let total = 0;
        sqftInputs.forEach(i => total += (parseFloat(i.value) || 0));
        document.getElementById('totalSqFt').textContent = total.toFixed(0);
      }
      function toggleServiceExtras() {
        const checked = Array.from(document.querySelectorAll('[name="services"]:checked')).map(cb => cb.value);
        document.getElementById('stainExtras').style.display = checked.includes('sanding_stain') ? 'grid' : 'none';
        document.getElementById('installExtras').style.display = checked.includes('hardwood_install') ? 'grid' : 'none';
      }
      document.addEventListener('DOMContentLoaded', () => { toggleServiceExtras(); recalcTotal(); });
    </script>
  `
}

function roomRowHtml(room: any, idx: number) {
  return `
    <div class="room-row grid grid-cols-2 md:grid-cols-6 gap-2 items-end bg-gray-50 border border-gray-200 rounded p-3">
      <input type="text" name="room_name" placeholder="Room name" value="${escapeHtml(room.room_name)}" class="border border-gray-300 rounded px-2 py-1 text-sm col-span-2 md:col-span-1">
      <input type="number" step="0.1" name="room_length" placeholder="Length ft" value="${escapeHtml(room.length_ft)}" class="border border-gray-300 rounded px-2 py-1 text-sm" oninput="recalcRoom(this)">
      <input type="number" step="0.1" name="room_width" placeholder="Width ft" value="${escapeHtml(room.width_ft)}" class="border border-gray-300 rounded px-2 py-1 text-sm" oninput="recalcRoom(this)">
      <input type="number" step="0.1" name="room_sqft" placeholder="Sq Ft" value="${escapeHtml(room.square_footage)}" class="border border-gray-300 rounded px-2 py-1 text-sm font-semibold" oninput="recalcTotal()">
      <select name="room_floor_type" class="border border-gray-300 rounded px-2 py-1 text-sm">
        ${FLOOR_TYPES.map((ft) => `<option value="${ft}" ${room.current_floor_type === ft ? 'selected' : ''}>${ft}</option>`).join('')}
      </select>
      <select name="room_condition" class="border border-gray-300 rounded px-2 py-1 text-sm">
        ${CONDITIONS.map((cd) => `<option value="${cd}" ${room.condition === cd ? 'selected' : ''}>${cd.replace(/_/g, ' ')}</option>`).join('')}
      </select>
      <input type="text" name="room_notes" placeholder="Notes" value="${escapeHtml(room.notes)}" class="border border-gray-300 rounded px-2 py-1 text-sm col-span-2 md:col-span-5">
      <button type="button" onclick="this.closest('.room-row').remove(); recalcTotal();" class="text-red-500 text-sm hover:text-red-700"><i class="fas fa-trash"></i></button>
    </div>
  `
}

visits.get('/new', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const body = `
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-clipboard-list text-amber-600 mr-2"></i>New Site Visit</h1>
      <a href="/admin/visits" class="text-sm text-gray-500 hover:text-gray-700"><i class="fas fa-arrow-left mr-1"></i> Back to list</a>
    </header>
    ${visitFormPage({}, [], false)}
  `
  return c.html(pageShell('New Site Visit — Michael AI', body))
})

visits.post('/new', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect
  return await saveVisit(c, null)
})

// ---------------------------------------------------------------------------
// DETAIL / EDIT — /admin/visits/:id  and  /admin/visits/:id/edit
// ---------------------------------------------------------------------------
visits.get('/:id/edit', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const id = c.req.param('id')
  const { env } = c
  const visit = await env.DB.prepare('SELECT * FROM site_visits WHERE id = ?').bind(id).first() as any
  if (!visit) return c.text('Visit not found', 404)
  visit.services = JSON.parse(visit.services_json || '[]')

  const { results: rooms } = await env.DB.prepare('SELECT * FROM site_visit_rooms WHERE visit_id = ? ORDER BY sort_order, id').bind(id).all()

  const body = `
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-clipboard-list text-amber-600 mr-2"></i>Edit Visit — ${escapeHtml(visit.client_name)}</h1>
      <a href="/admin/visits/${id}" class="text-sm text-gray-500 hover:text-gray-700"><i class="fas fa-arrow-left mr-1"></i> Back to visit</a>
    </header>
    ${visitFormPage(visit, rooms || [], true)}
  `
  return c.html(pageShell('Edit Visit — Michael AI', body))
})

visits.post('/:id', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect
  const id = c.req.param('id')
  return await saveVisit(c, id)
})

async function saveVisit(c: any, existingId: string | null) {
  const { env } = c
  const body = await c.req.parseBody({ all: true })

  const services = Array.isArray(body.services) ? body.services : (body.services ? [body.services] : [])

  // Rooms come in as parallel arrays since they share input names.
  const roomNames = arrayify(body.room_name)
  const roomLengths = arrayify(body.room_length)
  const roomWidths = arrayify(body.room_width)
  const roomSqfts = arrayify(body.room_sqft)
  const roomFloorTypes = arrayify(body.room_floor_type)
  const roomConditions = arrayify(body.room_condition)
  const roomNotes = arrayify(body.room_notes)

  let totalSqft = 0
  const rooms = roomNames.map((_, i) => {
    const sqft = parseFloat(roomSqfts[i]) || 0
    totalSqft += sqft
    return {
      room_name: roomNames[i] || null,
      length_ft: parseFloat(roomLengths[i]) || null,
      width_ft: parseFloat(roomWidths[i]) || null,
      square_footage: sqft || null,
      current_floor_type: roomFloorTypes[i] || null,
      condition: roomConditions[i] || null,
      notes: roomNotes[i] || null
    }
  }).filter((r) => r.room_name || r.square_footage)

  const fields = {
    client_name: str(body.client_name),
    phone: str(body.phone),
    email: str(body.email),
    address: str(body.address),
    city: str(body.city),
    property_type: str(body.property_type),
    visit_date: str(body.visit_date),
    services_json: JSON.stringify(services),
    stain_color: str(body.stain_color),
    finish_coats: intOrNull(body.finish_coats),
    install_type: str(body.install_type),
    total_square_footage: totalSqft || null,
    has_stairs: body.has_stairs ? 1 : 0,
    stairs_count: intOrNull(body.stairs_count),
    access_difficulty: str(body.access_difficulty),
    furniture_moving: str(body.furniture_moving),
    has_pets: body.has_pets ? 1 : 0,
    subfloor_condition: str(body.subfloor_condition),
    color_match_notes: str(body.color_match_notes),
    quoted_estimate: floatOrNull(body.quoted_estimate),
    final_price: floatOrNull(body.final_price),
    pricing_notes: str(body.pricing_notes),
    target_start_date: str(body.target_start_date),
    interest_level: str(body.interest_level),
    next_step: str(body.next_step),
    free_notes: str(body.free_notes)
  }

  let visitId = existingId

  if (existingId) {
    await env.DB.prepare(
      `UPDATE site_visits SET
        client_name=?, phone=?, email=?, address=?, city=?, property_type=?, visit_date=?,
        services_json=?, stain_color=?, finish_coats=?, install_type=?, total_square_footage=?,
        has_stairs=?, stairs_count=?, access_difficulty=?, furniture_moving=?, has_pets=?,
        subfloor_condition=?, color_match_notes=?, quoted_estimate=?, final_price=?, pricing_notes=?,
        target_start_date=?, interest_level=?, next_step=?, free_notes=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(
      fields.client_name, fields.phone, fields.email, fields.address, fields.city, fields.property_type, fields.visit_date,
      fields.services_json, fields.stain_color, fields.finish_coats, fields.install_type, fields.total_square_footage,
      fields.has_stairs, fields.stairs_count, fields.access_difficulty, fields.furniture_moving, fields.has_pets,
      fields.subfloor_condition, fields.color_match_notes, fields.quoted_estimate, fields.final_price, fields.pricing_notes,
      fields.target_start_date, fields.interest_level, fields.next_step, fields.free_notes, existingId
    ).run()

    await env.DB.prepare('DELETE FROM site_visit_rooms WHERE visit_id = ?').bind(existingId).run()
  } else {
    const shareToken = crypto.randomUUID().replace(/-/g, '')
    const result = await env.DB.prepare(
      `INSERT INTO site_visits (
        client_name, phone, email, address, city, property_type, visit_date,
        services_json, stain_color, finish_coats, install_type, total_square_footage,
        has_stairs, stairs_count, access_difficulty, furniture_moving, has_pets,
        subfloor_condition, color_match_notes, quoted_estimate, final_price, pricing_notes,
        target_start_date, interest_level, next_step, free_notes, share_token
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      fields.client_name, fields.phone, fields.email, fields.address, fields.city, fields.property_type, fields.visit_date,
      fields.services_json, fields.stain_color, fields.finish_coats, fields.install_type, fields.total_square_footage,
      fields.has_stairs, fields.stairs_count, fields.access_difficulty, fields.furniture_moving, fields.has_pets,
      fields.subfloor_condition, fields.color_match_notes, fields.quoted_estimate, fields.final_price, fields.pricing_notes,
      fields.target_start_date, fields.interest_level, fields.next_step, fields.free_notes, shareToken
    ).run()
    visitId = String(result.meta.last_row_id)
  }

  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i]
    await env.DB.prepare(
      `INSERT INTO site_visit_rooms (visit_id, room_name, length_ft, width_ft, square_footage, current_floor_type, condition, notes, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(visitId, r.room_name, r.length_ft, r.width_ft, r.square_footage, r.current_floor_type, r.condition, r.notes, i).run()
  }

  return c.redirect(`/admin/visits/${visitId}`)
}

function arrayify(v: any): string[] {
  if (v === undefined || v === null) return []
  return Array.isArray(v) ? v.map(String) : [String(v)]
}
function str(v: any): string | null {
  const s = v === undefined || v === null ? '' : String(v).trim()
  return s === '' ? null : s
}
function intOrNull(v: any): number | null {
  const n = parseInt(String(v ?? ''), 10)
  return isNaN(n) ? null : n
}
function floatOrNull(v: any): number | null {
  const n = parseFloat(String(v ?? ''))
  return isNaN(n) ? null : n
}

// ---------------------------------------------------------------------------
// DETAIL VIEW (read) — /admin/visits/:id
// ---------------------------------------------------------------------------
visits.get('/:id', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const id = c.req.param('id')
  const { env } = c
  const visit = await env.DB.prepare('SELECT * FROM site_visits WHERE id = ?').bind(id).first() as any
  if (!visit) return c.text('Visit not found', 404)

  const { results: rooms } = await env.DB.prepare('SELECT * FROM site_visit_rooms WHERE visit_id = ? ORDER BY sort_order, id').bind(id).all()
  const { results: photos } = await env.DB.prepare('SELECT * FROM site_visit_photos WHERE visit_id = ? ORDER BY created_at').bind(id).all()

  const shareUrl = `${new URL(c.req.url).origin}/share/visit/${visit.share_token}`

  const body = detailPageBody(visit, rooms || [], photos || [], shareUrl, true)
  return c.html(pageShell(`Visit — ${visit.client_name || ''} — Michael AI`, body, `
    <style>
      @media (max-width: 768px) { .photo-grid { grid-template-columns: repeat(2, 1fr) !important; } }
    </style>
  `))
})

function detailPageBody(visit: any, rooms: any[], photos: any[], shareUrl: string, isAdminView: boolean) {
  let services: string[] = []
  try { services = JSON.parse(visit.services_json || '[]') } catch {}
  const serviceLabels = services.map((s) => SERVICE_OPTIONS[s] || s).join(', ') || '—'

  const roomsHtml = rooms.map((r) => `
    <tr class="border-b border-gray-200">
      <td class="px-3 py-2 text-sm font-medium text-gray-800">${escapeHtml(r.room_name || '-')}</td>
      <td class="px-3 py-2 text-sm text-gray-600">${r.length_ft ?? '-'} x ${r.width_ft ?? '-'} ft</td>
      <td class="px-3 py-2 text-sm font-semibold text-gray-800">${r.square_footage ?? '-'} sq ft</td>
      <td class="px-3 py-2 text-sm text-gray-600">${escapeHtml(r.current_floor_type || '-')}</td>
      <td class="px-3 py-2 text-sm text-gray-600">${escapeHtml((r.condition || '-').replace(/_/g, ' '))}</td>
      <td class="px-3 py-2 text-sm text-gray-500">${escapeHtml(r.notes || '')}</td>
    </tr>
  `).join('')

  const photosHtml = photos.map((p: any) => `
    <div class="relative group">
      <img src="/admin/visits/${visit.id}/photo/${p.id}" class="w-full h-40 object-cover rounded-lg border border-gray-200" loading="lazy">
      ${p.room_name || p.caption ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(p.room_name || '')} ${p.caption ? '— ' + escapeHtml(p.caption) : ''}</p>` : ''}
      ${isAdminView ? `<form method="POST" action="/admin/visits/${visit.id}/photo/${p.id}/delete" class="absolute top-1 right-1"><button type="submit" onclick="return confirm('Delete this photo?')" class="bg-red-600 text-white rounded-full w-6 h-6 text-xs opacity-80 hover:opacity-100"><i class="fas fa-times"></i></button></form>` : ''}
    </div>
  `).join('')

  const interestBadge = visit.interest_level === 'hot' ? '🔥 Hot' : visit.interest_level === 'warm' ? '🌤 Warm' : visit.interest_level === 'cold' ? '❄️ Cold' : '—'

  return `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-800">
        <i class="fas fa-clipboard-list text-amber-600 mr-2"></i>
        ${isAdminView ? 'Site Visit' : 'Job Details'} — ${escapeHtml(visit.client_name || '')}
      </h1>
      ${isAdminView ? `
        <div class="flex gap-2">
          <a href="/admin/visits/${visit.id}/edit" class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded text-sm"><i class="fas fa-pen mr-1"></i> Edit</a>
          <a href="/admin/visits" class="text-sm text-gray-500 hover:text-gray-700 self-center"><i class="fas fa-arrow-left mr-1"></i> Back to list</a>
        </div>
      ` : ''}
    </header>
    ${isAdminView ? adminNav('visits') : ''}

    ${isAdminView ? `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p class="text-sm font-semibold text-amber-800"><i class="fab fa-whatsapp mr-1"></i> Share with subcontractor (no login needed)</p>
          <p class="text-xs text-amber-700 mt-1 break-all">${shareUrl}</p>
        </div>
        <button onclick="navigator.clipboard.writeText('${shareUrl}').then(()=>{this.textContent='Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'fas fa-copy mr-1\\'></i> Copy Link',1500)})" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded whitespace-nowrap">
          <i class="fas fa-copy mr-1"></i> Copy Link
        </button>
      </div>
    ` : ''}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-5">
        <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-user text-amber-600 mr-2"></i>Client & Property</h2>
        <dl class="text-sm space-y-1">
          <div><span class="text-gray-500">Phone:</span> ${visit.phone ? `<a href="tel:${escapeHtml(visit.phone)}" class="text-blue-600">${escapeHtml(visit.phone)}</a>` : '—'}</div>
          <div><span class="text-gray-500">Email:</span> ${visit.email ? `<a href="mailto:${escapeHtml(visit.email)}" class="text-blue-600">${escapeHtml(visit.email)}</a>` : '—'}</div>
          <div><span class="text-gray-500">Address:</span> ${escapeHtml(visit.address || '—')} ${escapeHtml(visit.city || '')}</div>
          <div><span class="text-gray-500">Property Type:</span> ${escapeHtml(visit.property_type || '—')}</div>
          <div><span class="text-gray-500">Visit Date:</span> ${escapeHtml(visit.visit_date || '—')}</div>
        </dl>
      </div>
      <div class="bg-white rounded-lg shadow p-5">
        <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-hammer text-amber-600 mr-2"></i>Service</h2>
        <dl class="text-sm space-y-1">
          <div><span class="text-gray-500">Service(s):</span> ${escapeHtml(serviceLabels)}</div>
          ${visit.stain_color ? `<div><span class="text-gray-500">Stain Color:</span> ${escapeHtml(visit.stain_color)}</div>` : ''}
          ${visit.finish_coats ? `<div><span class="text-gray-500">Finish Coats:</span> ${visit.finish_coats}</div>` : ''}
          ${visit.install_type ? `<div><span class="text-gray-500">Install Type:</span> ${escapeHtml(visit.install_type)}</div>` : ''}
          <div><span class="text-gray-500">Total Sq Ft:</span> <strong>${visit.total_square_footage ?? '—'}</strong></div>
        </dl>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-5 mb-6 overflow-x-auto">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-ruler-combined text-amber-600 mr-2"></i>Rooms & Measurements</h2>
      <table class="min-w-full">
        <thead><tr class="text-left text-xs font-semibold text-gray-500 uppercase">
          <th class="px-3 py-2">Room</th><th class="px-3 py-2">Dimensions</th><th class="px-3 py-2">Sq Ft</th>
          <th class="px-3 py-2">Current Floor</th><th class="px-3 py-2">Condition</th><th class="px-3 py-2">Notes</th>
        </tr></thead>
        <tbody>${roomsHtml || '<tr><td colspan="6" class="px-3 py-4 text-center text-gray-400">No rooms recorded.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="bg-white rounded-lg shadow p-5 mb-6">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-house-circle-check text-amber-600 mr-2"></i>Site Details</h2>
      <dl class="text-sm grid grid-cols-1 md:grid-cols-2 gap-1">
        <div><span class="text-gray-500">Stairs:</span> ${visit.has_stairs ? `Yes (${visit.stairs_count ?? '?'})` : 'No'}</div>
        <div><span class="text-gray-500">Access:</span> ${escapeHtml(visit.access_difficulty || '—')}</div>
        <div><span class="text-gray-500">Furniture Moving:</span> ${escapeHtml((visit.furniture_moving || '—').replace(/_/g, ' '))}</div>
        <div><span class="text-gray-500">Pets:</span> ${visit.has_pets ? 'Yes' : 'No'}</div>
        <div class="md:col-span-2"><span class="text-gray-500">Subfloor:</span> ${escapeHtml(visit.subfloor_condition || '—')}</div>
        <div class="md:col-span-2"><span class="text-gray-500">Color Match Notes:</span> ${escapeHtml(visit.color_match_notes || '—')}</div>
      </dl>
    </div>

    ${isAdminView ? `
    <div class="bg-white rounded-lg shadow p-5 mb-6">
      <h2 class="font-bold text-gray-800 mb-3"><i class="fas fa-dollar-sign text-amber-600 mr-2"></i>Pricing & Notes</h2>
      <dl class="text-sm grid grid-cols-1 md:grid-cols-2 gap-1">
        <div><span class="text-gray-500">Quoted Estimate:</span> ${visit.quoted_estimate != null ? '$' + Number(visit.quoted_estimate).toLocaleString() : '—'}</div>
        <div><span class="text-gray-500">Final Price:</span> ${visit.final_price != null ? '$' + Number(visit.final_price).toLocaleString() : '—'}</div>
        <div class="md:col-span-2"><span class="text-gray-500">Pricing Notes:</span> ${escapeHtml(visit.pricing_notes || '—')}</div>
        <div><span class="text-gray-500">Target Start:</span> ${escapeHtml(visit.target_start_date || '—')}</div>
        <div><span class="text-gray-500">Interest Level:</span> ${interestBadge}</div>
        <div><span class="text-gray-500">Next Step:</span> ${escapeHtml((visit.next_step || '—').replace(/_/g, ' '))}</div>
        <div class="md:col-span-2"><span class="text-gray-500">Free Notes:</span> ${escapeHtml(visit.free_notes || '—')}</div>
      </dl>
    </div>
    ` : ''}

    <div class="bg-white rounded-lg shadow p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-gray-800"><i class="fas fa-camera text-amber-600 mr-2"></i>Photos</h2>
      </div>
      ${isAdminView ? `
        <form method="POST" action="/admin/visits/${visit.id}/photo" enctype="multipart/form-data" class="flex flex-wrap items-end gap-3 mb-4 border border-dashed border-gray-300 rounded p-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Photo</label>
            <input type="file" name="photo" accept="image/*" capture="environment" required class="text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Room (optional)</label>
            <input type="text" name="room_name" class="border border-gray-300 rounded px-2 py-1 text-sm">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Caption (optional)</label>
            <input type="text" name="caption" class="border border-gray-300 rounded px-2 py-1 text-sm">
          </div>
          <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded"><i class="fas fa-upload mr-1"></i> Upload</button>
        </form>
      ` : ''}
      <div class="photo-grid grid grid-cols-2 md:grid-cols-4 gap-3">
        ${photosHtml || '<p class="text-gray-400 text-sm col-span-4">No photos yet.</p>'}
      </div>
    </div>
  `
}

// ---------------------------------------------------------------------------
// PHOTO UPLOAD / DELETE / SERVE — admin only
// ---------------------------------------------------------------------------
visits.post('/:id/photo', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const visitId = c.req.param('id')
  const { env } = c
  const body = await c.req.parseBody()
  const file = body.photo as File
  const roomName = str(body.room_name)
  const caption = str(body.caption)

  if (!file || typeof file === 'string') {
    return c.redirect(`/admin/visits/${visitId}`)
  }

  const key = `visits/${visitId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`
  await env.PHOTOS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'image/jpeg' }
  })

  await env.DB.prepare(
    'INSERT INTO site_visit_photos (visit_id, r2_key, room_name, caption) VALUES (?,?,?,?)'
  ).bind(visitId, key, roomName, caption).run()

  return c.redirect(`/admin/visits/${visitId}`)
})

visits.post('/:id/photo/:photoId/delete', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const visitId = c.req.param('id')
  const photoId = c.req.param('photoId')
  const { env } = c

  const photo = await env.DB.prepare('SELECT r2_key FROM site_visit_photos WHERE id = ? AND visit_id = ?').bind(photoId, visitId).first() as any
  if (photo) {
    await env.PHOTOS.delete(photo.r2_key)
    await env.DB.prepare('DELETE FROM site_visit_photos WHERE id = ?').bind(photoId).run()
  }

  return c.redirect(`/admin/visits/${visitId}`)
})

// Serve a photo — admin-only route (the public share page uses a separate,
// token-scoped photo route mounted in index.tsx).
visits.get('/:id/photo/:photoId', async (c) => {
  const redirect = await requireAuth(c)
  if (redirect) return redirect

  const photoId = c.req.param('photoId')
  const { env } = c
  const photo = await env.DB.prepare('SELECT r2_key FROM site_visit_photos WHERE id = ?').bind(photoId).first() as any
  if (!photo) return c.notFound()

  const object = await env.PHOTOS.get(photo.r2_key)
  if (!object) return c.notFound()

  return new Response(object.body, {
    headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' }
  })
})

export default visits
export { detailPageBody, pageShell, escapeHtml }
