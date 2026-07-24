import { Hono } from 'hono'

// ---------------------------------------------------------------------------
// Digital Business Card — /tarjeta (and /card as an English alias)
//
// A single mobile-friendly page (NOT a printed card, no "back side") that
// Luis can share via a link (WhatsApp, text, email signature, etc.). Shows
// the chosen "Rustic Craftsman" design image plus tap-to-act buttons:
// Call, WhatsApp, Email, Website, and "Save Contact" (downloads a .vcf file
// that phones use to add the contact automatically).
//
// Completely standalone/isolated: does not touch leads, visits, or the
// booking flow. Read-only, public, no login required (it's a business card).
// ---------------------------------------------------------------------------

const card = new Hono()

const BUSINESS = {
  name: 'Luis Morgado',
  title: 'Owner',
  company: 'Westchester Hardwood Experts',
  phone: '+19143162170',
  phoneDisplay: '(914) 316-2170',
  email: 'info@westchesterhardwoodexperts.com',
  website: 'https://westchesternyhardwoodfloors.com',
  websiteDisplay: 'westchesternyhardwoodfloors.com'
}

function renderCardPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BUSINESS.name} | ${BUSINESS.company}</title>
  <meta name="description" content="Digital business card for ${BUSINESS.name}, ${BUSINESS.title} at ${BUSINESS.company}.">
  <link rel="icon" type="image/png" href="/static/icons/favicon-32.png">
  <link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png">
  <meta name="theme-color" content="#3d2814">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .font-serif { font-family: 'Playfair Display', serif; }
  </style>
</head>
<body class="bg-gradient-to-b from-[#2a1a0f] to-[#3d2814] min-h-screen flex items-center justify-center p-4">
  <div class="max-w-sm w-full">

    <!-- Card image (the chosen "Rustic Craftsman" design) -->
    <div class="rounded-2xl overflow-hidden shadow-2xl border-2 border-[#c49a4a]/40">
      <img src="/static/images/business-card.jpg" alt="${BUSINESS.company} business card" class="w-full block">
    </div>

    <!-- Name / title -->
    <div class="text-center mt-6 mb-6">
      <h1 class="font-serif text-2xl font-bold text-white">${BUSINESS.name}</h1>
      <p class="text-[#d4af6a] text-sm font-semibold tracking-wide uppercase mt-1">${BUSINESS.title} · ${BUSINESS.company}</p>
    </div>

    <!-- Action buttons -->
    <div class="space-y-3">
      <a href="tel:${BUSINESS.phone}" class="flex items-center gap-3 bg-white/95 hover:bg-white text-[#3d2814] font-semibold px-5 py-3.5 rounded-xl transition shadow-lg">
        <span class="w-9 h-9 rounded-full bg-[#3d2814] text-[#d4af6a] flex items-center justify-center flex-shrink-0"><i class="fas fa-phone"></i></span>
        <span class="text-left">
          <span class="block text-xs text-gray-500 font-normal">Call</span>
          ${BUSINESS.phoneDisplay}
        </span>
      </a>

      <a href="https://wa.me/${BUSINESS.phone.replace('+', '')}" target="_blank" rel="noopener" class="flex items-center gap-3 bg-white/95 hover:bg-white text-[#3d2814] font-semibold px-5 py-3.5 rounded-xl transition shadow-lg">
        <span class="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center flex-shrink-0"><i class="fab fa-whatsapp"></i></span>
        <span class="text-left">
          <span class="block text-xs text-gray-500 font-normal">WhatsApp</span>
          Message on WhatsApp
        </span>
      </a>

      <a href="mailto:${BUSINESS.email}" class="flex items-center gap-3 bg-white/95 hover:bg-white text-[#3d2814] font-semibold px-5 py-3.5 rounded-xl transition shadow-lg">
        <span class="w-9 h-9 rounded-full bg-[#3d2814] text-[#d4af6a] flex items-center justify-center flex-shrink-0"><i class="fas fa-envelope"></i></span>
        <span class="text-left">
          <span class="block text-xs text-gray-500 font-normal">Email</span>
          <span class="break-all text-sm">${BUSINESS.email}</span>
        </span>
      </a>

      <a href="${BUSINESS.website}" target="_blank" rel="noopener" class="flex items-center gap-3 bg-white/95 hover:bg-white text-[#3d2814] font-semibold px-5 py-3.5 rounded-xl transition shadow-lg">
        <span class="w-9 h-9 rounded-full bg-[#3d2814] text-[#d4af6a] flex items-center justify-center flex-shrink-0"><i class="fas fa-globe"></i></span>
        <span class="text-left">
          <span class="block text-xs text-gray-500 font-normal">Website</span>
          ${BUSINESS.websiteDisplay}
        </span>
      </a>

      <a href="/tarjeta/contact.vcf" class="flex items-center gap-3 bg-[#d4af6a] hover:bg-[#c49a4a] text-[#3d2814] font-bold px-5 py-3.5 rounded-xl transition shadow-lg mt-5">
        <span class="w-9 h-9 rounded-full bg-[#3d2814] text-[#d4af6a] flex items-center justify-center flex-shrink-0"><i class="fas fa-user-plus"></i></span>
        <span class="text-left">
          <span class="block text-xs text-[#3d2814]/70 font-normal">Tap to</span>
          Save My Contact
        </span>
      </a>
    </div>

    <p class="text-center text-white/40 text-xs mt-8">Premium Hardwood Flooring Specialists · Westchester County, NY</p>
  </div>
</body>
</html>`
}

function buildVCard() {
  // Standard vCard 3.0 format — recognized by iPhone (Contacts app) and
  // Android (Google Contacts) as "Add to Contacts" when downloaded/opened.
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${BUSINESS.name.split(' ').reverse().join(';')};;;`,
    `FN:${BUSINESS.name}`,
    `ORG:${BUSINESS.company}`,
    `TITLE:${BUSINESS.title}`,
    `TEL;TYPE=CELL,VOICE:${BUSINESS.phone}`,
    `EMAIL;TYPE=INTERNET:${BUSINESS.email}`,
    `URL:${BUSINESS.website}`,
    'END:VCARD'
  ]
  return lines.join('\r\n')
}

card.get('/', (c) => {
  return c.html(renderCardPage())
})

card.get('/contact.vcf', (c) => {
  c.header('Content-Type', 'text/vcard; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="${BUSINESS.name.replace(/\s+/g, '_')}.vcf"`)
  return c.body(buildVCard())
})

export default card
