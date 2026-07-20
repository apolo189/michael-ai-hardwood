import { Hono } from 'hono'
import { pageShell } from '../lib/layout'

const pages = new Hono()

pages.get('/', (c) => {
  const body = `
  <!-- HERO -->
  <section class="relative overflow-hidden bg-gradient-to-b from-walnut-50 to-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div class="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p class="inline-flex items-center gap-2 text-forest-600 bg-forest-50 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <i class="fas fa-map-marker-alt"></i> Serving New Rochelle, Larchmont, Rye, Scarsdale &amp; Pelham
          </p>
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-walnut-900 leading-tight">
            Your Floors Aren't Old.<br>They're Forgotten.
          </h1>
          <p class="mt-6 text-lg text-walnut-700 max-w-xl">
            Every scratch, every dull patch — it's not permanent. Get your exact hardwood restoration estimate in under 5 minutes, before anyone ever sets foot in your home.
          </p>
          <div class="mt-8 flex flex-col sm:flex-row gap-4">
            <button id="hero-cta-btn" class="cta-pulse bg-gold-500 hover:bg-gold-400 text-walnut-900 font-bold px-6 py-4 rounded-lg text-center transition shadow-lg shadow-gold-500/30">
              <i class="fas fa-comment-dots mr-2"></i> Get My Estimate Now
            </button>
            <a href="tel:+19143162170" class="border border-walnut-300 hover:border-walnut-500 text-walnut-800 font-semibold px-6 py-4 rounded-lg text-center transition">
              <i class="fas fa-phone mr-2"></i> Call Now
            </a>
          </div>
          <p class="mt-3 text-sm text-forest-600 font-medium"><i class="fas fa-robot mr-1"></i> Powered by Michael AI — get your exact price in minutes, before anyone visits your home.</p>
          <p class="mt-2 text-sm text-walnut-500"><i class="fas fa-lock mr-1"></i> Your information is used only to prepare your estimate. See our <a href="/privacy-policy" class="underline">Privacy Policy</a>.</p>
        </div>
        <div class="relative">
          <div class="bg-white rounded-2xl shadow-2xl border border-walnut-100 p-3">
            <div class="grid grid-cols-2 gap-2">
              <div class="relative">
                <img src="/static/images/floor-before.jpg" alt="Illustrative example of an old, worn hardwood floor before restoration" class="rounded-xl w-full object-cover aspect-[4/3]">
                <span class="absolute top-2 left-2 bg-walnut-900/80 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">Before</span>
              </div>
              <div class="relative">
                <img src="/static/images/floor-after.jpg" alt="Illustrative example of a beautifully restored hardwood floor after refinishing" class="rounded-xl w-full object-cover aspect-[4/3]">
                <span class="absolute top-2 left-2 bg-forest-600/90 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">After</span>
              </div>
            </div>
            <p class="text-center text-walnut-800 font-serif font-semibold mt-3 text-sm">Your hardwood floors may not need replacement.<br>They may just need the right restoration.</p>
          </div>
          <p class="text-[11px] text-walnut-400 text-center mt-2">*Representative example — actual results vary by project.</p>
          <div class="absolute -top-5 -right-5 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3 border border-walnut-100 hidden sm:flex">
            <div class="bg-gold-500/15 text-gold-500 rounded-full w-11 h-11 flex items-center justify-center">
              <i class="fas fa-award"></i>
            </div>
            <div>
              <p class="font-bold text-walnut-900 leading-none text-sm">30+ Years</p>
              <p class="text-xs text-walnut-500">Hardwood Experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- AS EASY AS 1-2-3 -->
  <section class="py-12 bg-white border-t border-walnut-100">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <p class="text-center font-serif text-2xl sm:text-3xl font-bold text-walnut-900 mb-8">As Easy as 1-2-3</p>
      <div class="grid sm:grid-cols-3 gap-6">
        <div class="text-center">
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gold-500/15 text-gold-500 font-serif font-bold text-xl flex items-center justify-center">01</div>
          <p class="font-semibold text-walnut-900">Answer a Few Quick Questions</p>
          <p class="text-sm text-walnut-500 mt-1">Michael AI guides you, step by step — no forms to fill out.</p>
        </div>
        <div class="text-center">
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gold-500/15 text-gold-500 font-serif font-bold text-xl flex items-center justify-center">02</div>
          <p class="font-semibold text-walnut-900">Get Your Exact Price — Instantly</p>
          <p class="text-sm text-walnut-500 mt-1">No ranges, no waiting for a callback. A real number, right away.</p>
        </div>
        <div class="text-center">
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gold-500/15 text-gold-500 font-serif font-bold text-xl flex items-center justify-center">03</div>
          <p class="font-semibold text-walnut-900">Schedule Your Visit or Request a Call</p>
          <p class="text-sm text-walnut-500 mt-1">You decide — book a visit or talk to a specialist right now.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- PAIN POINTS -->
  <section class="py-16 bg-walnut-900">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="font-serif text-2xl sm:text-3xl font-bold text-white">Is Your Hardwood Floor Making Your Home Feel Older Than It Is?</h2>
      <p class="mt-3 text-walnut-300 max-w-2xl mx-auto">You keep the house clean. You take care of it. But the floor tells a different story.</p>
      <div class="mt-10 grid sm:grid-cols-3 gap-5 text-left">
        <div class="bg-walnut-800/60 border border-walnut-700 rounded-xl p-5">
          <div class="w-10 h-10 rounded-lg bg-walnut-700 flex items-center justify-center text-walnut-200 mb-3"><i class="fas fa-paw"></i></div>
          <p class="font-semibold text-white text-sm">Pet damage &amp; daily wear</p>
          <p class="text-walnut-300 text-xs mt-1">Claw marks and everyday traffic that just won't buff out.</p>
        </div>
        <div class="bg-walnut-800/60 border border-walnut-700 rounded-xl p-5">
          <div class="w-10 h-10 rounded-lg bg-walnut-700 flex items-center justify-center text-walnut-200 mb-3"><i class="fas fa-bolt"></i></div>
          <p class="font-semibold text-white text-sm">Scratches everywhere</p>
          <p class="text-walnut-300 text-xs mt-1">Every scuff is a reminder the floor stopped looking its best.</p>
        </div>
        <div class="bg-walnut-800/60 border border-walnut-700 rounded-xl p-5">
          <div class="w-10 h-10 rounded-lg bg-walnut-700 flex items-center justify-center text-walnut-200 mb-3"><i class="fas fa-cloud"></i></div>
          <p class="font-semibold text-white text-sm">Dull floors that lost their beauty</p>
          <p class="text-walnut-300 text-xs mt-1">A once-warm room that now feels flat and tired.</p>
        </div>
      </div>
      <p class="mt-10 font-serif text-2xl sm:text-3xl font-bold text-forest-400">We bring them back to life.</p>
    </div>
  </section>

  <!-- OLD WAY VS OUR WAY -->
  <section class="py-14 bg-white border-t border-walnut-100">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <h2 class="font-serif text-2xl sm:text-3xl font-bold text-walnut-900">No Guessing. No Hidden Surprises.</h2>
        <p class="mt-2 text-walnut-600 text-sm max-w-2xl mx-auto">Your estimate is calculated based on your selected service and square footage. Your specialist visit is only to confirm measurements and floor condition.</p>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="bg-walnut-50 rounded-xl p-5 border border-walnut-100">
          <p class="text-xs font-bold uppercase tracking-wide text-walnut-400 mb-3">The Old Way</p>
          <ul class="space-y-2 text-sm text-walnut-600">
            <li><i class="fas fa-times text-walnut-300 mr-2"></i>Call and wait days for a callback</li>
            <li><i class="fas fa-times text-walnut-300 mr-2"></i>"We'll quote you on-site" with no idea beforehand</li>
            <li><i class="fas fa-times text-walnut-300 mr-2"></i>Surprise costs after the visit</li>
          </ul>
        </div>
        <div class="bg-forest-50 rounded-xl p-5 border border-forest-100">
          <p class="text-xs font-bold uppercase tracking-wide text-forest-600 mb-3">Our Way</p>
          <ul class="space-y-2 text-sm text-walnut-700">
            <li><i class="fas fa-check text-forest-500 mr-2"></i>Get your estimate in minutes with Michael AI</li>
            <li><i class="fas fa-check text-forest-500 mr-2"></i>Transparent pricing before you schedule anything</li>
            <li><i class="fas fa-check text-forest-500 mr-2"></i>Same price in person, if details match what you told us</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- MEET MICHAEL AI -->
  <section class="py-16 bg-gradient-to-br from-forest-700 to-walnut-900">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-[auto_1fr] gap-8 items-center">
        <img src="/static/images/michael-ai-avatar.jpg" alt="Michael AI illustrated avatar icon" class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shadow-xl mx-auto md:mx-0 border-4 border-white/10">
        <div class="text-center md:text-left">
          <p class="inline-flex items-center gap-2 text-gold-400 text-xs font-bold uppercase tracking-widest mb-2">
            <i class="fas fa-robot"></i> Meet Michael AI
          </p>
          <h2 class="font-serif text-2xl sm:text-3xl font-bold text-white">Your Flooring Advisor — Trained on 30+ Years of Real Hardwood Expertise</h2>
          <p class="mt-3 text-walnut-200 max-w-xl mx-auto md:mx-0">Get your estimated investment before anyone visits your home. No waiting on a callback, no vague "we'll quote you on-site" — just straight answers, day or night.</p>
          <button id="meet-michael-cta-btn" class="mt-6 bg-gold-500 hover:bg-gold-400 text-walnut-900 font-semibold px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
            <i class="fas fa-comment-dots"></i> Talk to Michael AI Now
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- TRUST SECTION -->
  <section id="trust" class="py-16 bg-walnut-50 border-t border-walnut-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-walnut-500 text-xl shadow-sm"><i class="fas fa-award"></i></div>
          <p class="font-semibold text-walnut-900">30+ Years Experience</p>
          <p class="text-sm text-walnut-500">Hardwood flooring specialists</p>
        </div>
        <div>
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-walnut-500 text-xl shadow-sm"><i class="fas fa-hand-holding-usd"></i></div>
          <p class="font-semibold text-walnut-900">Transparent Pricing</p>
          <p class="text-sm text-walnut-500">No hidden surprises</p>
        </div>
        <div>
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-walnut-500 text-xl shadow-sm"><i class="fas fa-clipboard-check"></i></div>
          <p class="font-semibold text-walnut-900">Professional Evaluation</p>
          <p class="text-sm text-walnut-500">In-home visit &amp; confirmation</p>
        </div>
        <div>
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-walnut-500 text-xl shadow-sm"><i class="fas fa-tools"></i></div>
          <p class="font-semibold text-walnut-900">Quality Craftsmanship</p>
          <p class="text-sm text-walnut-500">Careful, detail-oriented work</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVICES -->
  <section id="services" class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h2 class="font-serif text-3xl sm:text-4xl font-bold text-walnut-900">Our Hardwood Flooring Services</h2>
        <p class="mt-3 text-walnut-600">Chat with Michael AI to get a transparent, exact estimate for any of these services.</p>
      </div>
      <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6" id="services-grid">
        ${serviceCard('fa-broom', 'Sanding & Refinishing — Natural Look', 'Restore worn hardwood to its natural beauty with complete sanding and a durable 3-coat finish.', '$3.50/sq ft')}
        ${serviceCard('fa-palette', 'Sanding & Refinishing — Custom Stain', 'Sanding plus a custom stain color of your choice, with 2 or 3 finish coats.', 'From $3.50/sq ft')}
        ${serviceCard('fa-hammer', 'Red Oak Installation 2 1/4"', 'Professional installation of new Red Oak hardwood flooring. Labor only.', '$3.75/sq ft')}
        ${serviceCard('fa-layer-group', 'Prefinished Hardwood Installation', 'Professional installation of prefinished hardwood. Labor only.', '$2.75/sq ft')}
        ${serviceCard('fa-th-large', 'Pergo / Laminate Installation', 'Expert installation of Pergo or laminate flooring. Labor only.', '$3.00/sq ft')}
      </div>
    </div>
  </section>

  <!-- CALCULATOR TEASER -->
  <section id="estimate" class="py-16 bg-walnut-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="font-serif text-3xl sm:text-4xl font-bold text-walnut-900">Know Your Investment Before You Decide</h2>
      <p class="mt-3 text-walnut-600">Michael AI walks you through a few simple questions and gives you an exact estimate — no ranges, no guessing.</p>
      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button id="estimate-cta-btn" class="bg-forest-600 hover:bg-forest-700 text-white font-semibold px-8 py-4 rounded-lg transition shadow-lg shadow-forest-600/20">
          <i class="fas fa-calculator mr-2"></i> Get My Estimate Now
        </button>
        <a href="tel:+19143162170" class="border border-walnut-300 hover:border-walnut-500 text-walnut-800 font-semibold px-8 py-4 rounded-lg transition">
          <i class="fas fa-phone mr-2"></i> Call Now
        </a>
      </div>
      <p class="mt-4 text-xs text-walnut-400 max-w-xl mx-auto">This estimate is based on your measurements and selections. Your flooring specialist will visit to confirm measurements and floor conditions — if everything matches, this is the price we honor.</p>
    </div>
  </section>

  <!-- SERVICE AREAS -->
  <section id="areas" class="py-16 bg-walnut-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-2xl mx-auto mb-10">
        <h2 class="font-serif text-3xl sm:text-4xl font-bold text-walnut-900">Proudly Serving Westchester County</h2>
        <p class="mt-3 text-walnut-600">Trusted by homeowners across premium residential communities.</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        ${['New Rochelle', 'Larchmont', 'Mamaroneck', 'Rye', 'Scarsdale', 'Pelham'].map(city => `
          <div class="bg-white rounded-xl border border-walnut-100 p-4 text-center shadow-sm">
            <i class="fas fa-map-marker-alt text-walnut-400 mb-2"></i>
            <p class="font-semibold text-walnut-800 text-sm">${city}, NY</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="py-16 bg-white">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="font-serif text-3xl sm:text-4xl font-bold text-walnut-900 text-center mb-10">Frequently Asked Questions</h2>
      <div class="space-y-4">
        ${faqItem('Is the online estimate final?', 'It is an exact estimate based on the information you provide — not a vague range. If the square footage and floor condition match what you told us, this is the same pricing you can expect after our specialist evaluation — the in-person visit is only to confirm measurements and floor condition.')}
        ${faqItem('Do prices include materials?', 'For sanding & refinishing services, yes. For Red Oak, prefinished, and laminate installation, our pricing is labor only — material costs are separate and depend on the product you select.')}
        ${faqItem("Can I get a quote for repairs online?", "Repairs always require an in-person evaluation because every situation is different. Chat with Michael AI and we'll happily schedule a specialist visit at no obligation.")}
        ${faqItem("How do I schedule an appointment?", "After getting your estimate from Michael AI, choose whether you'd like to schedule a visit (pick a preferred day and time window) or have a specialist call you directly — our team will confirm right away.")}
      </div>
    </div>
  </section>

  <!-- FINAL CTA -->
  <section class="py-16 bg-walnut-900">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="font-serif text-3xl sm:text-4xl font-bold text-white">Ready to See What's Possible for Your Floors?</h2>
      <p class="mt-3 text-walnut-300">Get your exact estimate in under 5 minutes — no obligation, no pressure, just honest answers.</p>
      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button id="final-cta-btn" class="cta-pulse bg-gold-500 hover:bg-gold-400 text-walnut-900 font-bold px-8 py-4 rounded-lg transition shadow-lg shadow-gold-500/30">
          <i class="fas fa-comment-dots mr-2"></i> Get My Estimate Now
        </button>
        <a href="tel:+19143162170" class="border border-walnut-600 hover:border-walnut-400 text-white font-semibold px-8 py-4 rounded-lg transition">
          <i class="fas fa-phone mr-2"></i> Call Now
        </a>
      </div>
    </div>
  </section>
  `

  return c.html(
    pageShell({
      title: 'Westchester Hardwood Experts | Premium Hardwood Flooring Sanding, Refinishing & Installation',
      description:
        'Expert hardwood flooring sanding, refinishing, and installation for New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale, and Pelham, NY. Get a free AI-powered estimate with Michael AI.',
      bodyContent: body
    })
  )
})

pages.get('/privacy-policy', (c) => {
  const body = `
  <section class="py-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose">
      <h1 class="font-serif text-4xl font-bold text-walnut-900 mb-6">Privacy Policy</h1>
      <p class="text-sm text-walnut-500 mb-8">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div class="space-y-6 text-walnut-700 leading-relaxed">
        <p>Westchester Hardwood Experts ("we", "us", or "our") operates this website (the "Site") and the Michael AI conversational assistant. This Privacy Policy explains how we collect, use, and protect information you provide to us.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Information We Collect</h2>
        <p>When you interact with Michael AI or submit a form, we may collect: your name, phone number, email address, home address, city, project details (service type, square footage, finish preferences), photos of your flooring, and your preferred appointment window.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">How We Use Your Information</h2>
        <ul class="list-disc pl-6 space-y-1">
          <li>To prepare a preliminary flooring estimate</li>
          <li>To schedule and confirm your in-person evaluation</li>
          <li>To contact you by phone, text, or email regarding your project</li>
          <li>To improve our services and website experience</li>
        </ul>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Photo Uploads</h2>
        <p>Photos you upload are used solely to help our team understand your floor's condition ahead of your evaluation. Photos are stored securely and are not shared with third parties or used for marketing without your consent.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Communication Consent</h2>
        <p>By submitting your information, you consent to receive calls and text messages from us about your project. Consent is not a condition of purchase. Message and data rates may apply. You may opt out at any time by replying STOP to text messages or requesting removal by phone or email.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Data Sharing</h2>
        <p>We do not sell your personal information. We use trusted third-party service providers (such as our AI assistant provider and email notification service) solely to operate this Site and respond to your inquiry.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Data Retention & Security</h2>
        <p>We retain your information only as long as necessary to fulfill your request and applicable business or legal requirements, and we use industry-standard measures to protect it.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Your Rights</h2>
        <p>You may request access to, correction of, or deletion of your personal information at any time by contacting us at <a href="mailto:info@westchesterhardwoodexperts.com" class="underline">info@westchesterhardwoodexperts.com</a>.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Contact Us</h2>
        <p>Westchester Hardwood Experts<br>Phone: (914) 316-2170<br>Email: info@westchesterhardwoodexperts.com</p>
      </div>
    </div>
  </section>
  `
  return c.html(pageShell({ title: 'Privacy Policy | Westchester Hardwood Experts', description: 'Our privacy policy.', bodyContent: body }))
})

pages.get('/terms-of-service', (c) => {
  const body = `
  <section class="py-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose">
      <h1 class="font-serif text-4xl font-bold text-walnut-900 mb-6">Terms of Service</h1>
      <p class="text-sm text-walnut-500 mb-8">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div class="space-y-6 text-walnut-700 leading-relaxed">
        <p>By accessing or using this website and the Michael AI conversational assistant, you agree to these Terms of Service.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Estimates Are Preliminary</h2>
        <p>Any pricing information, "estimated investment," or figures provided by Michael AI or this Site are preliminary estimates only, based on information you provide. They are not final quotes or binding offers. Final pricing is confirmed after an in-person professional evaluation.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Repairs</h2>
        <p>Repair services are never priced online. Every repair situation is unique and requires an in-person evaluation before any pricing is provided.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Appointment Scheduling</h2>
        <p>Requesting an appointment window through this Site does not guarantee a confirmed appointment. Our team will contact you to confirm availability.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Use of the AI Assistant</h2>
        <p>Michael AI is an automated assistant designed to help you understand hardwood flooring options. It is not a substitute for professional in-person inspection. Information provided is for general educational purposes and project qualification only.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Photo Submissions</h2>
        <p>By uploading photos, you confirm you have the right to share them and grant us permission to view them solely for the purpose of evaluating your flooring project.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Limitation of Liability</h2>
        <p>We are not liable for any decisions made solely based on preliminary online estimates. All work is subject to a separate written agreement following in-person evaluation.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Changes to These Terms</h2>
        <p>We may update these Terms from time to time. Continued use of the Site constitutes acceptance of the updated Terms.</p>

        <h2 class="text-xl font-bold text-walnut-900 mt-8">Contact</h2>
        <p>Westchester Hardwood Experts<br>Phone: (914) 316-2170<br>Email: info@westchesterhardwoodexperts.com</p>
      </div>
    </div>
  </section>
  `
  return c.html(pageShell({ title: 'Terms of Service | Westchester Hardwood Experts', description: 'Our terms of service.', bodyContent: body }))
})

pages.get('/accessibility', (c) => {
  const body = `
  <section class="py-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose">
      <h1 class="font-serif text-4xl font-bold text-walnut-900 mb-6">Accessibility Statement</h1>
      <div class="space-y-6 text-walnut-700 leading-relaxed">
        <p>Westchester Hardwood Experts is committed to ensuring digital accessibility for people of all abilities. We are continually improving the user experience for everyone and applying relevant accessibility standards.</p>
        <p>If you experience any difficulty accessing content on this website or interacting with Michael AI, please contact us at <a href="mailto:info@westchesterhardwoodexperts.com" class="underline">info@westchesterhardwoodexperts.com</a> or call (914) 316-2170, and we will make reasonable efforts to assist you.</p>
      </div>
    </div>
  </section>
  `
  return c.html(pageShell({ title: 'Accessibility Statement | Westchester Hardwood Experts', description: 'Our accessibility statement.', bodyContent: body }))
})

pages.get('/about', (c) => {
  const body = `
  <section class="py-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose">
      <h1 class="font-serif text-4xl font-bold text-walnut-900 mb-6">About Westchester Hardwood Experts</h1>
      <div class="space-y-6 text-walnut-700 leading-relaxed">
        <p>For over 30 years, our team has specialized exclusively in hardwood flooring — sanding, refinishing, and installation — for homeowners across Westchester County, including New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale, and Pelham.</p>
        <p>We built Michael AI, our conversational flooring specialist, to help homeowners understand their project and get a transparent, honest estimate before scheduling a visit — no pressure, no guesswork, just clarity.</p>
        <p>Every project starts with an honest conversation and ends with quality craftsmanship you can trust.</p>
      </div>
    </div>
  </section>
  `
  return c.html(pageShell({ title: 'About Us | Westchester Hardwood Experts', description: 'Learn about our 30+ years of hardwood flooring experience.', bodyContent: body }))
})

pages.get('/contact', (c) => {
  const body = `
  <section class="py-16">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h1 class="font-serif text-4xl font-bold text-walnut-900 mb-6">Contact Us</h1>
      <p class="text-walnut-600 mb-8">Have a question before chatting with Michael AI? Reach out directly.</p>
      <div class="space-y-3 text-walnut-800">
        <p><i class="fas fa-phone mr-2 text-walnut-500"></i><a href="tel:+19143162170" class="font-semibold">(914) 316-2170</a></p>
        <p><i class="fas fa-envelope mr-2 text-walnut-500"></i><a href="mailto:info@westchesterhardwoodexperts.com" class="font-semibold">info@westchesterhardwoodexperts.com</a></p>
        <p><i class="fas fa-map-marker-alt mr-2 text-walnut-500"></i>Serving New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale &amp; Pelham, NY</p>
      </div>
      <button id="contact-chat-btn" class="mt-8 bg-walnut-500 hover:bg-walnut-600 text-white font-semibold px-8 py-4 rounded-lg transition">
        <i class="fas fa-comment-dots mr-2"></i> Chat With Michael AI Instead
      </button>
    </div>
  </section>
  `
  return c.html(pageShell({ title: 'Contact Us | Westchester Hardwood Experts', description: 'Contact Westchester Hardwood Experts.', bodyContent: body }))
})

function serviceCard(icon: string, title: string, desc: string, price: string) {
  return `
  <div class="bg-white rounded-xl border border-walnut-100 p-6 shadow-sm hover:shadow-md transition">
    <div class="w-12 h-12 rounded-lg bg-walnut-50 flex items-center justify-center text-walnut-500 mb-4">
      <i class="fas ${icon}"></i>
    </div>
    <h3 class="font-bold text-walnut-900 mb-2">${title}</h3>
    <p class="text-sm text-walnut-600 mb-4">${desc}</p>
    <p class="text-walnut-500 text-xs font-semibold uppercase tracking-wide">Starting at ${price}</p>
  </div>`
}

function faqItem(q: string, a: string) {
  return `
  <details class="group bg-walnut-50 rounded-xl p-5 border border-walnut-100">
    <summary class="flex justify-between items-center cursor-pointer font-semibold text-walnut-900">
      ${q}
      <i class="fas fa-chevron-down text-walnut-400 group-open:rotate-180 transition-transform"></i>
    </summary>
    <p class="mt-3 text-sm text-walnut-600">${a}</p>
  </details>`
}


export default pages
