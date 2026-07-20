// ============================================================
// Michael AI — Guided Estimate Wizard
// 80% buttons / 20% free text. All pricing is calculated via
// /api/estimate/calculate (deterministic backend), never by the
// LLM. Free text is only sent to /api/chat/message as a fallback
// for off-script questions.
// ============================================================

(function () {
  const SESSION_KEY = 'michael_ai_session_id'

  const wizard = {
    service: null, // 'sanding_refinishing_natural' | 'sanding_refinishing_stain' | 'hardwood_install' | 'prefinished_install' | 'laminate_install'
    finishCoats: null, // 2 | 3 (only for stain)
    squareFootage: null,
    photoUrls: [],
    estimate: null,
    transcript: [] // {role, content} for the lead's conversation summary
  }

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
      <button id="chat-fab" class="fixed bottom-6 right-6 z-50 bg-walnut-500 hover:bg-walnut-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl transition">
        <i class="fas fa-comment-dots"></i>
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

  // ---------------------------------------------------------
  // WIZARD FLOW
  // ---------------------------------------------------------

  function startWizard() {
    addAssistantMessage("Hi, I'm Michael. I'll help you understand your hardwood flooring project.")
    setTimeout(() => {
      addAssistantMessage('What type of project are you looking for?')
      renderServiceStep()
    }, 350)
  }

  function renderServiceStep() {
    setActions(`
      <div id="service-options">
        ${wireBtn('svc-natural', actionButton('Sanding & Refinishing (Natural Look)', 'fa-broom'))}
        ${wireBtn('svc-stain', actionButton('Sanding & Refinishing (Custom Stain)', 'fa-palette'))}
        ${wireBtn('svc-hardwood', actionButton('Hardwood Installation (Red Oak)', 'fa-hammer'))}
        ${wireBtn('svc-prefinished', actionButton('Prefinished Hardwood Installation', 'fa-layer-group'))}
        ${wireBtn('svc-laminate', actionButton('Pergo / Laminate Installation', 'fa-th-large'))}
        <button id="svc-other" class="text-xs text-walnut-400 underline mt-1">Something else? Tell me about your project</button>
      </div>
    `)

    bindClick('svc-natural', () => selectService('sanding_refinishing_natural', 'Sanding & Refinishing (Natural Look)'))
    bindClick('svc-stain', () => selectService('sanding_refinishing_stain', 'Sanding & Refinishing (Custom Stain)'))
    bindClick('svc-hardwood', () => selectService('hardwood_install', 'Hardwood Installation (Red Oak)'))
    bindClick('svc-prefinished', () => selectService('prefinished_install', 'Prefinished Hardwood Installation'))
    bindClick('svc-laminate', () => selectService('laminate_install', 'Pergo / Laminate Installation'))
    bindClick('svc-other', () => {
      clearActions()
      addAssistantMessage("No problem — please describe your project below and I'll do my best to help, or we can schedule a specialist visit if needed.")
    })
  }

  function wireBtn(id, html) {
    return html.replace('class="wizard-btn', `id="${id}" class="wizard-btn`)
  }

  function bindClick(id, handler) {
    const elNode = document.getElementById(id)
    if (elNode) elNode.addEventListener('click', handler)
  }

  function selectService(key, label) {
    wizard.service = key
    addUserMessage(label)
    clearActions()

    if (key === 'sanding_refinishing_stain') {
      setTimeout(() => {
        addAssistantMessage('How many coats of finish would you like?')
        renderFinishCoatsStep()
      }, 300)
    } else {
      setTimeout(() => {
        addAssistantMessage('Approximately how many square feet of flooring are you looking to complete?')
        renderSquareFootageStep()
      }, 300)
    }
  }

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
    setTimeout(() => {
      addAssistantMessage('Approximately how many square feet of flooring are you looking to complete?')
      renderSquareFootageStep()
    }, 300)
  }

  function renderSquareFootageStep() {
    setActions(`
      <form id="sqft-form" class="space-y-2">
        <input id="sqft-input" type="number" min="1" step="1" placeholder="e.g. 800" required
          class="w-full border border-walnut-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-walnut-300">
        <p class="text-xs text-walnut-400">Not sure? Measure the room's length × width, or estimate using walking steps — one normal step is about 2 feet.</p>
        <button type="submit" class="w-full bg-walnut-500 hover:bg-walnut-600 text-white font-semibold py-2.5 rounded-lg text-sm">Continue</button>
      </form>
    `)
    const form = document.getElementById('sqft-form')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const val = Number(document.getElementById('sqft-input').value)
      if (!val || val <= 0) return
      selectSquareFootage(val)
    })
  }

  function selectSquareFootage(sqft) {
    wizard.squareFootage = sqft
    addUserMessage(sqft + ' sq ft')
    clearActions()
    setTimeout(() => {
      addAssistantMessage('Would you like to upload a few photos of your floors? This helps us understand your project before the visit — totally optional.')
      renderPhotoStep()
    }, 300)
  }

  function renderPhotoStep() {
    setActions(`
      <div class="space-y-2">
        <label class="block cursor-pointer border border-walnut-200 hover:border-walnut-500 rounded-xl px-4 py-3 text-sm font-medium text-walnut-700 text-center transition">
          <input id="photo-input" type="file" accept="image/*" multiple class="hidden">
          <i class="fas fa-camera mr-2 text-walnut-500"></i> Upload Photos
        </label>
        <button id="skip-photos-btn" class="w-full text-walnut-400 text-xs underline py-1">Skip for now</button>
        <div id="photo-preview" class="flex flex-wrap gap-2"></div>
      </div>
    `)
    document.getElementById('photo-input').addEventListener('change', onPhotoSelected)
    document.getElementById('skip-photos-btn').addEventListener('click', () => {
      addUserMessage('Skip photo upload')
      clearActions()
      proceedToEstimate()
    })
  }

  async function onPhotoSelected(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    for (const file of files) {
      const formData = new FormData()
      formData.append('photo', file)
      try {
        const res = await axios.post('/api/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        if (res.data && res.data.key) {
          wizard.photoUrls.push(res.data.key)
          const preview = document.getElementById('photo-preview')
          if (preview) {
            preview.insertAdjacentHTML('beforeend', `<span class="text-xs bg-forest-50 text-forest-700 rounded-full px-3 py-1"><i class="fas fa-check mr-1"></i>Photo added</span>`)
          }
        }
      } catch (err) {
        // fail silently per-photo, continue
      }
    }

    addUserMessage(`📷 Uploaded ${wizard.photoUrls.length} photo(s)`)
    setTimeout(() => {
      const btn = el('<button id="continue-after-photo-btn" class="w-full bg-walnut-500 hover:bg-walnut-600 text-white font-semibold py-2.5 rounded-lg text-sm mt-2">Continue</button>')
      document.getElementById('chat-actions').appendChild(btn)
      btn.addEventListener('click', () => { clearActions(); proceedToEstimate() })
    }, 100)
  }

  async function proceedToEstimate() {
    addAssistantMessage("Great, let me calculate your estimate...")

    try {
      const res = await axios.post('/api/estimate/calculate', {
        service: wizard.service,
        squareFootage: wizard.squareFootage,
        finishCoats: wizard.finishCoats || undefined
      })
      wizard.estimate = res.data
      renderEstimateResult(res.data)
    } catch (err) {
      addAssistantMessage("Sorry, I couldn't calculate that estimate. Please call us at (914) 555-0142 and we'll help right away.")
    }
  }

  function renderEstimateResult(estimate) {
    const laborNote = estimate.laborOnly ? ' (labor only — materials not included)' : ''
    const total = '$' + Number(estimate.total).toLocaleString('en-US')

    setTimeout(() => {
      const container = document.getElementById('chat-messages')
      const card = el(`
        <div class="flex justify-start">
          <div class="bg-white border border-forest-200 rounded-xl p-4 max-w-[92%] w-full text-sm shadow-sm">
            <p class="text-xs uppercase tracking-wide text-forest-600 font-bold mb-1">Your Estimated Investment</p>
            <p class="text-2xl font-serif font-bold text-walnut-900">${total}${laborNote}</p>
            <p class="text-xs text-walnut-500 mt-1">${escapeHtml(estimate.service.label)} · ${estimate.squareFootage} sq ft · $${estimate.pricePerSqFt}/sq ft</p>
            <p class="text-xs text-walnut-400 mt-3">${escapeHtml(estimate.disclaimer)}</p>
          </div>
        </div>
      `)
      container.appendChild(card)
      scrollToBottom()

      setTimeout(() => {
        addAssistantMessage('Would you like to speak with a flooring specialist?')
        renderPostEstimateStep()
      }, 400)
    }, 300)
  }

  function renderPostEstimateStep() {
    setActions(`
      <div id="post-estimate-options">
        ${wireBtn('schedule-visit-btn', actionButton('Schedule My Visit', 'fa-calendar-check'))}
        ${wireBtn('call-me-btn', actionButton('Call Me Now', 'fa-phone'))}
      </div>
    `)
    bindClick('schedule-visit-btn', () => { clearActions(); addUserMessage('Schedule My Visit'); showBookingForm(false) })
    bindClick('call-me-btn', () => { clearActions(); addUserMessage('Call Me Now'); showBookingForm(true) })
  }

  function showBookingForm(wantsCallNow) {
    setTimeout(() => {
      addAssistantMessage(wantsCallNow ? "Great — leave your info below and a specialist will call you shortly." : "Great — let's get your visit scheduled.")

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
                <option>New Rochelle</option>
                <option>Larchmont</option>
                <option>Mamaroneck</option>
                <option>Rye</option>
                <option>Scarsdale</option>
                <option>Pelham</option>
                <option>Other</option>
              </select>
              ${wantsCallNow ? '' : `
              <select name="appointmentDayPref" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
                <option value="Monday-Friday">Monday - Friday</option>
                <option value="Saturday morning">Saturday morning</option>
              </select>
              <select name="appointmentWindow" required class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Preferred time window</option>
                <option>8 AM - 11 AM</option>
                <option>11 AM - 2 PM</option>
                <option>2 PM - 5 PM</option>
              </select>`}
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

  async function onBookingSubmit(e, wantsCallNow) {
    e.preventDefault()
    const form = e.target
    const errorEl = form.querySelector('#booking-form-error')
    errorEl.classList.add('hidden')

    const formData = new FormData(form)
    const serviceLabel = wizard.estimate ? wizard.estimate.service.label : wizard.service

    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city'),
      appointmentDayPref: wantsCallNow ? '' : formData.get('appointmentDayPref'),
      appointmentWindow: wantsCallNow ? '' : formData.get('appointmentWindow'),
      consentContact: formData.get('consentContact') === 'on',
      photoUrls: wizard.photoUrls,
      conversationSummary: wizard.transcript.map((m) => `${m.role}: ${m.content}`).join('\n'),
      service: serviceLabel,
      squareFootage: wizard.squareFootage,
      finishCoats: wizard.finishCoats,
      estimateTotal: wizard.estimate ? wizard.estimate.total : null,
      laborOnly: wizard.estimate ? wizard.estimate.laborOnly : false,
      wantsCallNow: wantsCallNow
    }

    const submitBtn = form.querySelector('button[type=submit]')
    submitBtn.disabled = true
    submitBtn.textContent = 'Sending...'

    try {
      const res = await axios.post('/api/lead/submit', payload)
      if (res.data && res.data.success) {
        const confirmMsg = wantsCallNow
          ? `✅ Thank you, ${escapeHtml(payload.name)}! A flooring specialist will call you shortly at ${escapeHtml(payload.phone)}.`
          : `✅ Thank you, ${escapeHtml(payload.name)}! Your request has been received. Our team will reach out to confirm your ${escapeHtml(payload.appointmentWindow || '')} appointment.`
        form.closest('.bg-white').outerHTML = `<div class="flex justify-start"><div class="chat-bubble-assistant px-4 py-3 max-w-[85%] text-sm">${confirmMsg}</div></div>`
      } else {
        throw new Error(res.data?.error || 'Unknown error')
      }
    } catch (err) {
      errorEl.textContent = 'Something went wrong. Please try again or call us at (914) 555-0142.'
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

    try {
      const res = await axios.post('/api/chat/message', {
        messages: wizard.transcript.map((m) => ({ role: m.role, content: m.content }))
      })
      removeTypingIndicator()
      const data = res.data
      addAssistantMessage(data.reply || "Could you tell me a bit more?")
    } catch (err) {
      removeTypingIndicator()
      addAssistantMessage("Sorry, something went wrong. Please try again, or call us at (914) 555-0142.")
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
