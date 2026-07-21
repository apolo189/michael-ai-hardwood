// Shared HTML shell used by all pages (compliance-friendly: consistent header/footer with
// business identity, Privacy Policy & Terms links on every page, per Google Ads policy).

export function pageShell(opts: { title: string; description: string; bodyContent: string; activeNav?: string; web3formsKey?: string }) {
  const { title, description, bodyContent, web3formsKey } = opts
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="icon" href="data:,">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            walnut: { 50:'#faf6f2',100:'#f0e6da',200:'#dfc9ab',300:'#c9a877',400:'#b3874f',500:'#8a5f30',600:'#6e4a26',700:'#54371d',800:'#3d2814',900:'#28190c' },
            forest: { 50:'#f2f6f3',100:'#dfe9e1',400:'#5c8d6c',500:'#3f6b4d',600:'#345a40',700:'#294732'},
            gold: { 400:'#d4af6a',500:'#c49a4a'}
          },
          fontFamily: {
            serif: ['"Playfair Display"','serif'],
            sans: ['Inter','sans-serif']
          }
        }
      }
    }
  </script>
</head>
<body class="font-sans text-walnut-900 bg-white">
  <header id="site-header" class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-walnut-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
      <a href="/" class="flex items-center gap-2">
        <i class="fas fa-tree text-walnut-500 text-xl"></i>
        <span class="font-serif text-lg font-bold text-walnut-800">Westchester Hardwood Experts</span>
      </a>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-walnut-700">
        <a href="/#services" class="hover:text-walnut-500">Services</a>
        <a href="/#areas" class="hover:text-walnut-500">Service Areas</a>
        <a href="/#trust" class="hover:text-walnut-500">Why Us</a>
        <a href="/#faq" class="hover:text-walnut-500">FAQ</a>
      </nav>
      <div class="flex items-center gap-4">
        <a href="tel:+19143162170" class="hidden sm:flex items-center gap-2 text-sm font-semibold text-walnut-800">
          <i class="fas fa-phone text-walnut-500"></i> (914) 316-2170
        </a>
        <button id="open-chat-btn" class="bg-walnut-500 hover:bg-walnut-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition">
          <i class="fas fa-comment-dots mr-1"></i> Ask Michael AI
        </button>
      </div>
    </div>
  </header>

  <main>
    ${bodyContent}
  </main>

  <footer class="bg-walnut-900 text-walnut-200 mt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <div class="flex items-center gap-2 mb-3">
          <i class="fas fa-tree text-walnut-300"></i>
          <span class="font-serif text-lg font-bold text-white">Westchester Hardwood Experts</span>
        </div>
        <p class="text-sm text-walnut-300">Premium hardwood flooring sanding, refinishing, and installation for Westchester County homeowners. 30+ years of craftsmanship.</p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Company</h4>
        <ul class="text-sm space-y-2 text-walnut-300">
          <li><a href="/about" class="hover:text-white">About Us</a></li>
          <li><a href="/#services" class="hover:text-white">Services</a></li>
          <li><a href="/#areas" class="hover:text-white">Service Areas</a></li>
          <li><a href="/contact" class="hover:text-white">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Legal</h4>
        <ul class="text-sm space-y-2 text-walnut-300">
          <li><a href="/privacy-policy" class="hover:text-white">Privacy Policy</a></li>
          <li><a href="/terms-of-service" class="hover:text-white">Terms of Service</a></li>
          <li><a href="/accessibility" class="hover:text-white">Accessibility Statement</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Contact</h4>
        <ul class="text-sm space-y-2 text-walnut-300">
          <li><i class="fas fa-phone mr-2"></i><a href="tel:+19143162170" class="hover:text-white">(914) 316-2170</a></li>
          <li><i class="fas fa-envelope mr-2"></i><a href="mailto:info@westchesterhardwoodexperts.com" class="hover:text-white">info@westchesterhardwoodexperts.com</a></li>
          <li><i class="fas fa-map-marker-alt mr-2"></i>Serving New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale &amp; Pelham, NY</li>
        </ul>
      </div>
    </div>
    <div class="border-t border-walnut-800 py-4 text-center text-xs text-walnut-400">
      &copy; ${new Date().getFullYear()} Westchester Hardwood Experts. All rights reserved. This site collects information for the sole purpose of preparing your flooring estimate and scheduling your appointment.
    </div>
  </footer>

  <!-- Michael AI Chat Widget -->
  <div id="chat-widget-root"></div>

  <script>
    // Web3Forms Access Key is designed to be public (client-side use is the
    // documented/free-plan way to call their API). We save the lead to our
    // own D1 database server-side regardless; this key only powers the
    // email notification sent directly from the visitor's browser.
    window.WEB3FORMS_ACCESS_KEY = ${JSON.stringify(web3formsKey || '')};
  </script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/chat-widget.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`
}
