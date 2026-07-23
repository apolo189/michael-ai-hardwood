// ============================================================
// Michael AI — Guided Estimate Wizard (Consultant Flow v3)
// 80% buttons / 20% free text. All pricing is calculated via
// /api/estimate/calculate (deterministic backend), never by the
// LLM. Free text is only sent to /api/chat/message as a fallback
// for off-script questions.
//
// v3 goal: Michael should feel like an experienced flooring
// consultant qualifying a project, not a form/calculator. Every
// assistant reply waits at least THINKING_DELAY_MS (with a visible
// typing indicator) before appearing, and each answer gets a short
// acknowledgment before the next question — deliberately paced.
// ============================================================

(function () {
  const SESSION_KEY = 'michael_ai_session_id'
  const THINKING_DELAY_MS = 5000 // minimum "thinking" pause before Michael replies

  const wizard = {
    service: null, // 'sanding_refinishing_natural' | 'sanding_refinishing_stain' | 'hardwood_install' | 'prefinished_install' | 'laminate_install' | 'repair'
    serviceLabel: null,
    isRepair: false,
    finishCoats: null, // 2 | 3 (only for stain)
    squareFootage: null,
    timeline: null, // 'ASAP' | 'Within 1 Week' | 'Within 2 Weeks' | 'Within 30 Days'
    city: null,
    estimate: null,
    transcript: [] // {role, content} for the lead's conversation summary
  }

  const ROOM_SIZE_SQFT = { Small: 120, Medium: 200, Large: 300 }
  const MINIMUM_PROJECT_SQFT = 500 // must match src/lib/pricing.ts MINIMUM_PROJECT_SQFT

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = 'sess_' + Math.random().toString(36).slice(2) + Date.now()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  }

  function el(html) {
    const div = document.createElement('div')
    div.innerHTML = html.trim()
    return div.firstElementChild
  }

  function scrollToBottom() {
    const container = document.getElementById('chat-messages')
    if (container) container.scrollTop = container.scrollHeight
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  function renderRoot() {
    const root = document.getElementById('chat-widget-root')
    root.innerHTML = `
      <button id="chat-fab" class="cta-pulse fixed bottom-6 right-6 z-50 bg-gold-500 hover:bg-gold-400 text-walnut-900 font-bold rounded-full flex items-center justify-center gap-2 transition shadow-xl w-16 h-16 sm:w-auto sm:h-auto sm:px-5 sm:py-4 text-2xl sm:text-base">
        <i class="fas fa-comment-dots"></i>
        <span class="hidden sm:inline">Get My Estimate Now</span>
      </button>

      <div id="michael-chat-panel" class="hidden-state fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm h-[75vh] max-h-[640px] bg-white rounded-2xl shadow-2xl border border-walnut-100 flex flex-col overflow-hidden">
        <div class="bg-walnut-500 text-white px-4 py-3 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
            <i class="fas fa-user-tie"></i>
          </div>
          <div class="flex-1">
            <p class="font-semibold leading-none">Michael AI</p>
            <p class="text-xs text-walnut-100">Hardwood Flooring Specialist</p>
          </div>
          <button id="chat-close-btn" class="text-white/80 hover:text-white text-lg"><i class="fas fa-times"></i></button>
        </div>

        <div id="chat-messages" class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-walnut-50/40"></div>

        <div id="chat-actions" class="px-4 pb-3"></div>

        <form id="chat-input-form" class="border-t border-walnut-100 p-3 flex items-center gap-2 bg-white">
          <input id="chat-text-input" type="text" placeholder="Or type a question..." autocomplete="off"
            class="flex-1 border border-walnut-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-walnut-300">
          <button type="submit" class="bg-walnut-500 hover:bg-walnut-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
            <i class="fas fa-arrow-up"></i>
          </button>
        </form>
        <p class="text-[10px] text-walnut-400 text-center pb-2">By chatting, you agree to our <a href="/privacy-policy" class="underline">Privacy Policy</a>.</p>
      </div>
    `

    document.getElementById('chat-fab').addEventListener('click', openChat)
    document.getElementById('chat-close-btn').addEventListener('click', closeChat)
    document.getElementById('chat-input-form').addEventListener('submit', onFreeTextSubmit)
  }

  function openChat() {
    const panel = document.getElementById('michael-chat-panel')
    panel.classList.remove('hidden-state')
    document.getElementById('chat-fab').classList.add('hidden')
    if (wizard.transcript.length === 0) {
      startWizard()
    }
  }

  function closeChat() {
    document.getElementById('michael-chat-panel').classList.add('hidden-state')
    document.getElementById('chat-fab').classList.remove('hidden')
  }

  function addAssistantMessage(content) {
    wizard.transcript.push({ role: 'assistant', content })
    const container = document.getElementById('chat-messages')
    const bubble = el(`
      <div class="flex justify-start">
        <div class="chat-bubble-assistant px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap">${escapeHtml(content)}</div>
      </div>
    `)
    container.appendChild(bubble)
    scrollToBottom()
  }

  function addUserMessage(content) {
    wizard.transcript.push({ role: 'user', content })
    const container = document.getElementById('chat-messages')
    const bubble = el(`
      <div class="flex justify-end">
        <div class="chat-bubble-user px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap">${escapeHtml(content)}</div>
      </div>
    `)
    container.appendChild(bubble)
    scrollToBottom()
  }

  function setActions(html) {
    document.getElementById('chat-actions').innerHTML = html
  }

  function clearActions() {
    setActions('')
  }

  function actionButton(label, icon) {
    return `<button class="wizard-btn w-full text-left border border-walnut-200 hover:border-walnut-500 hover:bg-walnut-50 text-walnut-800 rounded-xl px-4 py-3 text-sm font-medium mb-2 flex items-center gap-3 transition">
      <span class="w-8 h-8 rounded-lg bg-walnut-50 flex items-center justify-center text-walnut-500"><i class="fas ${icon}"></i></span>
      ${escapeHtml(label)}
    </button>`
  }

  function wireBtn(id, html) {
    return html.replace('class="wizard-btn', `id="${id}" class="wizard-btn`)
  }

  function bindClick(id, handler) {
    const elNode = document.getElementById(id)
    if (elNode) elNode.addEventListener('click', handler)
  }

  // ---------------------------------------------------------
  // PACING HELPER — every Michael reply waits at least
  // THINKING_DELAY_MS with a visible typing indicator, so the
  // conversation feels considered rather than instant/robotic.
  // ---------------------------------------------------------
  function respondAfterThinking(renderFn) {
    addTypingIndicator()
    setTimeout(() => {
      removeTypingIndicator()
      renderFn()
    }, THINKING_DELAY_MS)
  }

  // Adds a short acknowledgment bubble, then (after a brief natural
  // pause) the next question bubble, then renders that step's actions.
  function ackThenAsk(ackText, questionText, renderStepFn) {
    respondAfterThinking(() => {
      addAssistantMessage(ackText)
      setTimeout(() => {
        addAssistantMessage(questionText)
        renderStepFn()
      }, 500)
    })
  }

  // ---------------------------------------------------------
  // WIZARD FLOW
  // ---------------------------------------------------------

  function startWizard() {
    respondAfterThinking(() => {
      addAssistantMessage("Hi, I'm Michael.")
      setTimeout(() => {
        addAssistantMessage("Before I calculate your investment, I'd like to understand your project so I can prepare the most accurate estimate possible.")
        setTimeout(() => {
          addAssistantMessage('What type of project are you planning?')
          renderServiceStep()
        }, 500)
      }, 500)
    })
  }

  // --- Q1: Service type ---

  function renderServiceStep() {
    setActions(`
      <div id="service-options">
        ${wireBtn('svc-natural', actionButton('Sanding & Refinishing (Natural)', 'fa-broom'))}
        ${wireBtn('svc-stain', actionButton('Sanding & Custom Stain', 'fa-palette'))}
        ${wireBtn('svc-install', actionButton('New Hardwood Installation', 'fa-hammer'))}
        ${wireBtn('svc-repair', actionButton('Repair Hardwood Floors', 'fa-tools'))}
        <button id="svc-other" class="text-xs text-walnut-400 underline mt-1">Something else? Tell me about your project</button>
      </div>
    `)

    bindClick('svc-natural', () => selectService('sanding_refinishing_natural', 'Sanding & Refinishing (Natural)'))
    bindClick('svc-stain', () => selectService('sanding_refinishing_stain', 'Sanding & Custom Stain'))
    bindClick('svc-install', () => {
      addUserMessage('New Hardwood Installation')
      clearActions()
      ackThenAsk(
        "Great choice — new hardwood installation is one of the best investments you can make in a home.",
        'Which type of installation are you considering?',
        renderInstallTypeStep
      )
    })
    bindClick('svc-repair', () => selectService('repair', 'Repair Hardwood Floors'))
    bindClick('svc-other', () => {
      clearActions()
      addAssistantMessage("No problem — please describe your project below and I'll do my best to help, or we can schedule a specialist visit if needed.")
    })
  }

  function renderInstallTypeStep() {
    setActions(`
      <div id="install-type-options">
        ${wireBtn('install-redoak', actionButton('Red Oak Installation 2 1/4"', 'fa-hammer'))}
        ${wireBtn('install-prefinished', actionButton('Prefinished Hardwood Installation', 'fa-layer-group'))}
        ${wireBtn('install-laminate', actionButton('Pergo / Laminate Installation', 'fa-th-large'))}
      </div>
    `)
    bindClick('install-redoak', () => selectService('hardwood_install', 'Red Oak Installation 2 1/4"'))
    bindClick('install-prefinished', () => selectService('prefinished_install', 'Prefinished Hardwood Installation'))
    bindClick('install-laminate', () => selectService('laminate_install', 'Pergo / Laminate Installation'))
  }

  function selectService(key, label) {
    wizard.service = key
    wizard.serviceLabel = label
    wizard.isRepair = key === 'repair'
    addUserMessage(label)
    clearActions()

    if (key === 'sanding_refinishing_stain') {
      ackThenAsk(
        "Custom stain is a beautiful way to personalize your floors, and it's one of our most requested services.",
        'Now let\'s talk about protection. How many coats of finish would you like?',
        renderFinishCoatsStep
      )
    } else if (key === 'repair') {
      ackThenAsk(
        "Got it — repairs are common, and every situation is a little different, so I want to make sure I understand the scope.",
        "Approximately how many square feet does the affected area cover?",
        renderSquareFootageStep
      )
    } else {
      const niceties = {
        sanding_refinishing_natural: "Great choice. Sanding & refinishing is one of our most requested services — it can completely transform a tired floor.",
        hardwood_install: "Red oak is a timeless choice that holds up beautifully for decades.",
        prefinished_install: "Prefinished hardwood is a great option — durable, and ready to enjoy right after installation.",
        laminate_install: "Laminate is a smart, budget-friendly way to get the hardwood look."
      }
      ackThenAsk(
        (niceties[key] || "Perfect, that helps me understand the scope.") + " Now let's estimate the size of your project.",
        'Approximately how many square feet of flooring are you looking to complete?',
        renderSquareFootageStep
      )
    }
  }

  // --- Custom stain sub-question: finish coats ---

  function renderFinishCoatsStep() {
    setActions(`
      <div id="coats-options">
        ${wireBtn('coats-2', actionButton('2 Coats', 'fa-layer-group'))}
        ${wireBtn('coats-3', actionButton('3 Coats (extra durability)', 'fa-shield-alt'))}
      </div>
      <p class="text-xs text-walnut-400 mt-1">Three coats provide additional protection and are recommended for higher-traffic areas, but require additional drying time.</p>
    `)
    bindClick('coats-2', () => selectFinishCoats(2))
    bindClick('coats-3', () => selectFinishCoats(3))
  }

  function selectFinishCoats(coats) {
    wizard.finishCoats = coats
    addUserMessage(coats + ' Coats')
    clearActions()
    ackThenAsk(
      (coats === 3 ? "Good call — extra protection is worth it for busy rooms." : "Sounds good.") + " Now let's estimate the size of your project.",
      'Approximately how many square feet of flooring are you looking to complete?',
      renderSquareFootageStep
    )
  }

  // --- Q2: Square footage ---

  function renderSquareFootageStep() {
    setActions(`
      <form id="sqft-form" class="space-y-2">
        <input id="sqft-input" type="number" min="1" step="1" placeholder="Enter square footage" required
          class="w-full border border-walnut-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-walnut-300">
        <button type="submit" class="w-full bg-walnut-500 hover:bg-walnut-600 text-white font-semibold py-2.5 rounded-lg text-sm">Continue</button>
        <button type="button" id="sqft-unsure-btn" class="w-full text-walnut-400 text-xs underline py-1">I don't know my square footage</button>
      </form>
    `)
    const form = document.getElementById('sqft-form')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const val = Number(document.getElementById('sqft-input').value)
      if (!val || val <= 0) return
      addUserMessage(val + ' sq ft')
      clearActions()
      afterSquareFootage(val)
    })
    bindClick('sqft-unsure-btn', () => {
      addUserMessage("I don't know my square footage")
      clearActions()
      ackThenAsk(
        "No problem, I can work with that.",
        'How many rooms are we talking about?',
        renderRoomsCountStep
      )
    })
  }

  function renderRoomsCountStep() {
    setActions(`
      <div id="rooms-options" class="grid grid-cols-4 gap-2">
        ${['1', '2', '3', '4+'].map((n) => `<button data-rooms="${n}" class="rooms-btn border border-walnut-200 hover:border-walnut-500 hover:bg-walnut-50 text-walnut-800 rounded-lg py-2 text-sm font-medium transition">${n}</button>`).join('')}
      </div>
    `)
    document.querySelectorAll('.rooms-btn').forEach((btn) => {
      btn.addEventListener('click', () => selectRoomsCount(btn.getAttribute('data-rooms')))
    })
  }

  function selectRoomsCount(roomsLabel) {
    wizard._roomsCount = roomsLabel === '4+' ? 4 : Number(roomsLabel)
    addUserMessage(roomsLabel + (roomsLabel === '1' ? ' room' : ' rooms'))
    clearActions()
    ackThenAsk(
      "Got it.",
      'And about how large would you say those rooms are on average?',
      renderRoomSizeStep
    )
  }

  function renderRoomSizeStep() {
    setActions(`
      <div id="room-size-options">
        ${wireBtn('size-small', actionButton('Small (e.g. bedroom)', 'fa-compress'))}
        ${wireBtn('size-medium', actionButton('Medium (e.g. living room)', 'fa-square'))}
        ${wireBtn('size-large', actionButton('Large (e.g. open floor plan)', 'fa-expand'))}
      </div>
    `)
    bindClick('size-small', () => selectRoomSize('Small'))
    bindClick('size-medium', () => selectRoomSize('Medium'))
    bindClick('size-large', () => selectRoomSize('Large'))
  }

  function selectRoomSize(size) {
    addUserMessage(size)
    clearActions()
    const estimatedSqft = wizard._roomsCount * ROOM_SIZE_SQFT[size]
    respondAfterThinking(() => {
      addAssistantMessage(`Based on that, I'll use approximately ${estimatedSqft} sq ft for your estimate.`)
      setTimeout(() => {
        afterSquareFootage(estimatedSqft)
      }, 500)
    })
  }

  // Common continuation after square footage is known (typed or estimated)
  function afterSquareFootage(sqft) {
    wizard.squareFootage = sqft
    let sizeNote
    if (sqft < 250) {
      sizeNote = "Got it. That's a nice, manageable size for this kind of project."
    } else if (sqft < 700) {
      sizeNote = "Got it. That's a very common project size — we see this a lot."
    } else {
      sizeNote = "Got it. That's a substantial project — good thing we plan for it carefully."
    }
    ackThenAsk(
      sizeNote + ' One last question —',
      'how soon would you like to start?',
      renderTimelineStep
    )
  }

  // --- Q3: Timeline ---

  function renderTimelineStep() {
    setActions(`
      <div id="timeline-options">
        ${wireBtn('tl-asap', actionButton('ASAP', 'fa-bolt'))}
        ${wireBtn('tl-1wk', actionButton('Within 1 Week', 'fa-calendar-day'))}
        ${wireBtn('tl-2wk', actionButton('Within 2 Weeks', 'fa-calendar-week'))}
        ${wireBtn('tl-30d', actionButton('Within 30 Days', 'fa-calendar'))}
      </div>
    `)
    bindClick('tl-asap', () => selectTimeline('ASAP'))
    bindClick('tl-1wk', () => selectTimeline('Within 1 Week'))
    bindClick('tl-2wk', () => selectTimeline('Within 2 Weeks'))
    bindClick('tl-30d', () => selectTimeline('Within 30 Days'))
  }

  function selectTimeline(value) {
    wizard.timeline = value
    addUserMessage(value)
    clearActions()
    ackThenAsk(
      value === 'ASAP' ? "Understood — we'll treat this as a priority." : "Good to know, thank you.",
      'And just to make sure we schedule the right team for your area — which city is the project located in?',
      renderCityStep
    )
  }

  // --- Q4: City ---

  function renderCityStep() {
    setActions(`
      <form id="city-form" class="space-y-2">
        <select id="city-input" required class="w-full border border-walnut-200 rounded-lg px-3 py-2.5 text-sm">
          <option value="">Select your city</option>
          <option>New Rochelle</option>
          <option>Larchmont</option>
          <option>Pelham</option>
          <option>Mamaroneck</option>
          <option>Rye</option>
          <option>Scarsdale</option>
          <option>Other</option>
        </select>
        <button type="submit" class="w-full bg-walnut-500 hover:bg-walnut-600 text-white font-semibold py-2.5 rounded-lg text-sm">Continue</button>
      </form>
    `)
    const form = document.getElementById('city-form')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const val = document.getElementById('city-input').value
      if (!val) return
      selectCity(val)
    })
  }

  function selectCity(value) {
    wizard.city = value
    addUserMessage(value)
    clearActions()
    respondAfterThinking(() => {
      addAssistantMessage('Great.')
      setTimeout(() => {
        if (!wizard.isRepair) {
          const fitPhrase = {
            sanding_refinishing_natural: 'refinishing',
            sanding_refinishing_stain: 'a custom stain refinish',
            hardwood_install: 'a new hardwood installation',
            prefinished_install: 'a new hardwood installation',
            laminate_install: 'a new laminate installation'
          }[wizard.service] || 'this project'
          addAssistantMessage(`Based on what you've shared, your floors appear to be a great candidate for ${fitPhrase}.`)
        }
        setTimeout(() => {
          addAssistantMessage(wizard.isRepair ? "Here's what I'd recommend:" : "Here's your estimated investment:")
          proceedToEstimate()
        }, wizard.isRepair ? 0 : 500)
      }, 500)
    })
  }

  // --- Estimate (or, for repairs, the no-online-price message) ---

  async function proceedToEstimate() {
    if (wizard.isRepair) {
      setTimeout(() => {
        const container = document.getElementById('chat-messages')
        const card = el(`
          <div class="flex justify-start">
            <div class="bg-white border border-walnut-200 rounded-xl p-4 max-w-[92%] w-full text-sm shadow-sm">
              <p class="text-xs uppercase tracking-wide text-walnut-500 font-bold mb-1"><i class="fas fa-tools mr-1"></i>Repair Evaluation Needed</p>
              <p class="text-walnut-800">Repairs are unique — I'd rather have Luis take a look in person so you get an accurate number, not a guess. There's no obligation, and the visit is free.</p>
            </div>
          </div>
        `)
        container.appendChild(card)
        scrollToBottom()

        setTimeout(() => {
          addAssistantMessage('What would you like to do next?')
          renderPostEstimateStep()
        }, 500)
      }, 300)
      return
    }

    try {
      const res = await axios.post('/api/estimate/calculate', {
        service: wizard.service,
        squareFootage: wizard.squareFootage,
        finishCoats: wizard.finishCoats || undefined
      })
      wizard.estimate = res.data
      renderEstimateResult(res.data)
    } catch (err) {
      addAssistantMessage("Sorry, I couldn't calculate that estimate. Please call us at (914) 316-2170 and we'll help right away.")
    }
  }

  function renderEstimateResult(estimate) {
    const laborNote = estimate.laborOnly ? ' (labor only — materials not included)' : ''
    const total = '$' + Number(estimate.total).toLocaleString('en-US')
    const billedSqft = estimate.billedSquareFootage != null ? estimate.billedSquareFootage : estimate.squareFootage
    const minimumNote = estimate.minimumApplied
      ? `<p class="text-xs text-walnut-400 mt-1"><i class="fas fa-info-circle mr-1"></i>Your project (${estimate.squareFootage} sq ft) is billed at our ${MINIMUM_PROJECT_SQFT}-sq-ft minimum, which covers setup, materials, and travel for smaller jobs.</p>`
      : ''

    setTimeout(() => {
      const container = document.getElementById('chat-messages')
      const card = el(`
        <div class="flex justify-start">
          <div class="bg-white border border-forest-200 rounded-xl p-4 max-w-[92%] w-full text-sm shadow-sm">
            <p class="text-xs uppercase tracking-wide text-forest-600 font-bold mb-1">Your Estimated Investment</p>
            <p class="text-2xl font-serif font-bold text-walnut-900">${total}${laborNote}</p>
            <p class="text-xs text-walnut-500 mt-1">${escapeHtml(estimate.service.label)} · ${billedSqft} sq ft · $${estimate.pricePerSqFt}/sq ft</p>
            ${minimumNote}
          </div>
        </div>
      `)
      container.appendChild(card)
      scrollToBottom()

      setTimeout(() => {
        addAssistantMessage("This estimate is based on the information you provided. If the measurements and floor condition match during our visit, this is the price we'll honor.")
        setTimeout(() => {
          addAssistantMessage('What would you like to do next?')
          renderPostEstimateStep()
        }, 500)
      }, 500)
    }, 300)
  }

  // --- Post-estimate: schedule / call / keep chatting ---

  function renderPostEstimateStep() {
    setActions(`
      <div id="post-estimate-options">
        ${wireBtn('schedule-visit-btn', actionButton('Schedule My Visit', 'fa-calendar-check'))}
        ${wireBtn('call-me-btn', actionButton('Call Me Now', 'fa-phone'))}
        ${wireBtn('ask-more-btn', actionButton('Ask Michael Another Question', 'fa-comment-dots'))}
      </div>
    `)
    bindClick('schedule-visit-btn', () => { clearActions(); addUserMessage('Schedule My Visit'); showBookingForm(false) })
    bindClick('call-me-btn', () => { clearActions(); addUserMessage('Call Me Now'); showBookingForm(true) })
    bindClick('ask-more-btn', () => {
      clearActions()
      addUserMessage('Ask Michael Another Question')
      respondAfterThinking(() => {
        addAssistantMessage("Of course — go ahead and type your question below, and I'll do my best to help.")
        const input = document.getElementById('chat-text-input')
        if (input) input.focus()
      })
    })
  }

  function minAppointmentDate() {
    // Earliest selectable date is tomorrow (avoids same-day scheduling pressure).
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  function formatAppointmentDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  function showBookingForm(wantsCallNow) {
    setTimeout(() => {
      addAssistantMessage(wantsCallNow ? "Great — leave your info below and a specialist will call you shortly." : "Great — let's get your visit scheduled.")

      const cityOptions = ['New Rochelle', 'Larchmont', 'Pelham', 'Mamaroneck', 'Rye', 'Scarsdale', 'Other']
      const cityOptionsHtml = cityOptions
        .map((c) => `<option ${wizard.city === c ? 'selected' : ''}>${c}</option>`)
        .join('')

      const container = document.getElementById('chat-messages')
      const formCard = el(`
        <div class="flex justify-start">
          <div class="bg-white border border-walnut-200 rounded-xl p-4 max-w-[95%] w-full text-sm shadow-sm">
            <form id="booking-form" class="space-y-2">
              <input required name="name" placeholder="Full name" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <input required name="phone" placeholder="Phone number" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <input name="email" placeholder="Email (optional)" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <input name="address" placeholder="Street address" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <select name="city" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select your city</option>
                ${cityOptionsHtml}
              </select>
              ${wantsCallNow ? '' : `
              <label class="block text-xs text-walnut-500 -mb-1">Preferred visit date</label>
              <input required type="date" name="appointmentDate" min="${minAppointmentDate()}" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <select name="appointmentWindow" required class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Preferred time window</option>
                <option>8 AM - 11 AM</option>
                <option>11 AM - 2 PM</option>
                <option>2 PM - 5 PM</option>
              </select>
              <p class="text-xs text-walnut-400">Available Monday - Friday, and Saturday mornings.</p>`}
              <label class="flex items-start gap-2 text-xs text-walnut-500 pt-1">
                <input required type="checkbox" name="consentContact" class="mt-0.5">
                <span>I agree to be contacted by phone, text, or email about my project. Consent is not required for purchase. Msg &amp; data rates may apply.</span>
              </label>
              <button type="submit" class="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold py-2 rounded-lg mt-2">
                ${wantsCallNow ? 'Request My Call' : 'Confirm Request'}
              </button>
              <p id="booking-form-error" class="text-red-500 text-xs hidden"></p>
            </form>
          </div>
        </div>
      `)
      container.appendChild(formCard)
      scrollToBottom()

      formCard.querySelector('#booking-form').addEventListener('submit', (e) => onBookingSubmit(e, wantsCallNow))
    }, 300)
  }

  async function sendWeb3FormsNotification(payload) {
    const accessKey = window.WEB3FORMS_ACCESS_KEY
    if (!accessKey) return

    const estimateText = wizard.isRepair
      ? 'Repair — requires in-person evaluation (no online price)'
      : payload.estimateTotal != null
        ? `$${payload.estimateTotal}${payload.laborOnly ? ' (labor only, materials not included)' : ''}`
        : 'Requires in-person evaluation'

    const minimumNote = wizard.estimate && wizard.estimate.minimumApplied
      ? ` (billed at ${MINIMUM_PROJECT_SQFT} sq ft minimum)`
      : ''

    const message = `
NEW HARDWOOD FLOORING LEAD

Customer Name: ${payload.name || 'N/A'}
Phone: ${payload.phone || 'N/A'}
Email: ${payload.email || 'N/A'}
Address: ${payload.address || 'N/A'}
City: ${payload.city || 'N/A'}

Service Selected: ${payload.service || 'N/A'}
Square Footage: ${payload.squareFootage ?? 'N/A'}${minimumNote}
Desired Start: ${payload.timeline || 'N/A'}
Estimated Investment: ${estimateText}

Requested Visit Date: ${payload.appointmentDayPref || 'N/A'}
Preferred Time Window: ${payload.appointmentWindow || 'N/A'}
Wants a call now: ${payload.wantsCallNow ? 'YES - call ASAP' : 'No, scheduled visit preferred'}

Contact Consent (TCPA): ${payload.consentContact ? 'YES - customer agreed to be contacted by phone/text' : 'NOT CONFIRMED'}

--- Conversation Summary ---
${payload.conversationSummary || 'N/A'}
`.trim()

    // Use fetch() + JSON body (Web3Forms' own recommended, proven-working method).
    // IMPORTANT: keepalive:true tells the browser to finish sending this request
    // even if the page is navigated away from, backgrounded, or the screen is
    // locked right after tapping submit (very common on mobile right after a
    // form is confirmed) — without this, mobile browsers can silently abort
    // the request before it ever reaches Web3Forms, even though the lead was
    // already safely saved to our own database in the step before this one.
    return fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        access_key: accessKey,
        subject: '🔥 NEW HARDWOOD LEAD',
        from_name: 'Michael AI - Hardwood Flooring Assistant',
        name: payload.name || 'Website Lead',
        email: payload.email || 'noreply@michaelai-hardwood.com',
        phone: payload.phone || '',
        message: message
      })
    })
  }

  async function onBookingSubmit(e, wantsCallNow) {
    e.preventDefault()
    const form = e.target
    const errorEl = form.querySelector('#booking-form-error')
    errorEl.classList.add('hidden')

    const formData = new FormData(form)
    const serviceLabel = wizard.estimate ? wizard.estimate.service.label : wizard.serviceLabel

    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city') || wizard.city,
      appointmentDate: wantsCallNow ? '' : formData.get('appointmentDate'),
      appointmentDayPref: wantsCallNow ? '' : formatAppointmentDate(formData.get('appointmentDate')),
      appointmentWindow: wantsCallNow ? '' : formData.get('appointmentWindow'),
      consentContact: formData.get('consentContact') === 'on',
      conversationSummary: wizard.transcript.map((m) => `${m.role}: ${m.content}`).join('\n'),
      service: serviceLabel,
      squareFootage: wizard.squareFootage,
      finishCoats: wizard.finishCoats,
      timeline: wizard.timeline,
      estimateTotal: wizard.estimate ? wizard.estimate.total : null,
      laborOnly: wizard.estimate ? wizard.estimate.laborOnly : false,
      wantsCallNow: wantsCallNow
    }

    const submitBtn = form.querySelector('button[type=submit]')
    submitBtn.disabled = true
    submitBtn.textContent = 'Sending...'

    try {
      // 1. Always save the lead to our own database first (source of truth).
      const res = await axios.post('/api/lead/submit', payload)
      if (res.data && res.data.success) {
        // 2. Fire the Google Ads conversion event now that the lead is confirmed saved.
        //    Guarded so a missing/blocked gtag (ad blockers, etc.) never breaks the flow.
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', { send_to: 'AW-18326378981/m7o5CNr3y9QcEOWz2aJE' })
        }

        // 3. Send the email notification directly from the browser via Web3Forms.
        //    Web3Forms' free plan requires client-side calls (their server-side
        //    API needs a paid plan + IP whitelisting), so we fire this from here
        //    instead of relying on the backend. Best-effort: if it fails, the
        //    lead is still safely stored in our database above.
        sendWeb3FormsNotification(payload).catch((e) => console.warn('Web3Forms notify failed:', e))

        const confirmMsg = wantsCallNow
          ? `✅ Thank you, ${escapeHtml(payload.name)}! A flooring specialist will call you at ${escapeHtml(payload.phone)} within the next 30 minutes.`
          : `✅ Thank you, ${escapeHtml(payload.name)}! You've requested a visit on <strong>${escapeHtml(formatAppointmentDate(payload.appointmentDate))}</strong>, between <strong>${escapeHtml(payload.appointmentWindow || '')}</strong>. Our team will call you within the next 30 minutes to confirm this date and time.`
        form.closest('.bg-white').outerHTML = `<div class="flex justify-start"><div class="chat-bubble-assistant px-4 py-3 max-w-[85%] text-sm">${confirmMsg}</div></div>`
      } else {
        throw new Error(res.data?.error || 'Unknown error')
      }
    } catch (err) {
      errorEl.textContent = 'Something went wrong. Please try again or call us at (914) 316-2170.'
      errorEl.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = wantsCallNow ? 'Request My Call' : 'Confirm Request'
    }
  }

  // ---------------------------------------------------------
  // FREE TEXT FALLBACK (off-script questions, repairs, etc.)
  // ---------------------------------------------------------

  async function onFreeTextSubmit(e) {
    e.preventDefault()
    const input = document.getElementById('chat-text-input')
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    addUserMessage(text)
    addTypingIndicator()

    const startedAt = Date.now()
    try {
      const res = await axios.post('/api/chat/message', {
        messages: wizard.transcript.map((m) => ({ role: m.role, content: m.content }))
      })
      const data = res.data
      const elapsed = Date.now() - startedAt
      setTimeout(() => {
        removeTypingIndicator()
        addAssistantMessage(data.reply || "Could you tell me a bit more?")
      }, Math.max(0, THINKING_DELAY_MS - elapsed))
    } catch (err) {
      const elapsed = Date.now() - startedAt
      setTimeout(() => {
        removeTypingIndicator()
        addAssistantMessage("Sorry, something went wrong. Please try again, or call us at (914) 316-2170.")
      }, Math.max(0, THINKING_DELAY_MS - elapsed))
    }
  }

  function addTypingIndicator() {
    const container = document.getElementById('chat-messages')
    const bubble = el(`
      <div id="typing-indicator" class="flex justify-start">
        <div class="chat-bubble-assistant px-4 py-3 flex gap-1">
          <span class="typing-dot w-1.5 h-1.5 bg-walnut-400 rounded-full inline-block"></span>
          <span class="typing-dot w-1.5 h-1.5 bg-walnut-400 rounded-full inline-block"></span>
          <span class="typing-dot w-1.5 h-1.5 bg-walnut-400 rounded-full inline-block"></span>
        </div>
      </div>
    `)
    container.appendChild(bubble)
    scrollToBottom()
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator')
    if (indicator) indicator.remove()
  }

  window.openMichaelChat = openChat
  document.addEventListener('DOMContentLoaded', renderRoot)
})()
