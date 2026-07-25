import { Hono } from 'hono'

// ---------------------------------------------------------------------------
// Hub — /hub
//
// A single central page that links out to every tool built for Luis:
//   - Digital business card (/tarjeta)
//   - Admin: Leads dashboard (/admin/leads) — password protected
//   - Admin: Site Visits tool (/admin/visits) — password protected
//   - Public website (westchesternyhardwoodfloors.com)
//   - GitHub source code repository
//
// This page itself has NO login and shows NO sensitive data — it is just a
// directory of links. Each admin tool still requires the password when
// opened. Meant to be saved to the phone home screen / browser bookmarks as
// the one place to find everything.
// ---------------------------------------------------------------------------

const hub = new Hono()

function toolCard(opts: {
  icon: string
  iconBg: string
  title: string
  description: string
  href: string
  cta: string
  external?: boolean
}) {
  const target = opts.external ? ' target="_blank" rel="noopener"' : ''
  return `
    <a href="${opts.href}"${target} class="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-100">
      <div class="flex items-start gap-4">
        <span class="w-12 h-12 rounded-xl ${opts.iconBg} text-white flex items-center justify-center flex-shrink-0 text-xl">
          <i class="fas ${opts.icon}"></i>
        </span>
        <div class="flex-1">
          <h2 class="font-bold text-gray-800 text-lg">${opts.title}</h2>
          <p class="text-gray-500 text-sm mt-0.5">${opts.description}</p>
          <span class="inline-flex items-center gap-1 text-[#3d2814] text-sm font-semibold mt-2">
            ${opts.cta} <i class="fas fa-arrow-right text-xs"></i>
          </span>
        </div>
      </div>
    </a>
  `
}

function renderHubPage() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Michael AI — Panel Principal</title>
  <meta name="description" content="Acceso central a todas las herramientas de Westchester Hardwood Experts">
  <link rel="manifest" href="/static/manifest-hub.json">
  <link rel="icon" type="image/png" sizes="32x32" href="/static/icons/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/static/icons/favicon-16.png">
  <link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Mi Panel">
  <meta name="theme-color" content="#3d2814">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .font-serif { font-family: 'Playfair Display', serif; }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="bg-gradient-to-b from-[#2a1a0f] to-[#3d2814] px-4 pt-10 pb-14">
    <div class="max-w-2xl mx-auto text-center">
      <img src="/static/icons/icon-192.png" alt="Michael AI" class="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg">
      <h1 class="font-serif text-2xl font-bold text-white">Michael AI</h1>
      <p class="text-[#d4af6a] text-sm font-semibold tracking-wide uppercase mt-1">Panel Principal · Westchester Hardwood Experts</p>
      <p class="text-white/60 text-sm mt-3">Todas tus herramientas en un solo lugar. Guarda esta página en favoritos o en tu pantalla de inicio.</p>
    </div>
  </div>

  <div class="max-w-2xl mx-auto px-4 -mt-8 pb-12 space-y-4">

    ${toolCard({
      icon: 'fa-id-card',
      iconBg: 'bg-[#d4af6a] text-[#3d2814]',
      title: 'Tarjeta Digital',
      description: 'Tu tarjeta de negocio para compartir por WhatsApp, texto o QR.',
      href: '/tarjeta',
      cta: 'Ver / Compartir'
    })}

    ${toolCard({
      icon: 'fa-list-check',
      iconBg: 'bg-amber-600',
      title: 'Panel de Leads',
      description: 'Clientes que llenaron el formulario en el sitio web (requiere contraseña).',
      href: '/admin/leads',
      cta: 'Entrar al panel'
    })}

    ${toolCard({
      icon: 'fa-clipboard-list',
      iconBg: 'bg-amber-600',
      title: 'Visitas de Sitio',
      description: 'Notas, medidas y fotos de cada visita, para compartir con subcontratistas (requiere contraseña).',
      href: '/admin/visits',
      cta: 'Entrar al panel'
    })}

    ${toolCard({
      icon: 'fa-globe',
      iconBg: 'bg-[#3d2814]',
      title: 'Sitio Web Público',
      description: 'La página principal que ven tus clientes: westchesternyhardwoodfloors.com',
      href: 'https://westchesternyhardwoodfloors.com',
      cta: 'Visitar sitio',
      external: true
    })}

    ${toolCard({
      icon: 'fa-code-branch',
      iconBg: 'bg-gray-700',
      title: 'Código Fuente (GitHub)',
      description: 'El código completo del proyecto, guardado y con historial de todos los cambios.',
      href: 'https://github.com/apolo189/michael-ai-hardwood',
      cta: 'Ver en GitHub',
      external: true
    })}

    <p class="text-center text-gray-400 text-xs pt-4">Michael AI · Westchester County, NY</p>
  </div>
</body>
</html>`
}

hub.get('/', (c) => c.html(renderHubPage()))

export default hub
