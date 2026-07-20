// ============================================================
// Michael AI Chat Widget
// Handles: conversation, quick-reply buttons, photo upload,
// and a compliance-safe final lead form (with real consent
// checkbox + appointment window selector).
// ============================================================

(function () {
  const STORAGE_KEY = 'michael_ai_messages_v1'
  const SESSION_KEY = 'michael_ai_session_id'

  const state = {
    open: false,
    messages: [], // {role, content}
    photoUrls: [],
    sending: false,
    leadSubmitted: false
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

  function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight
  }

  function renderRoot() {
    const root = document.getElementById('chat-widget-root')
    root.innerHTML = `
      <button id="chat-fab" class="fixed bottom-6 right-6 z-50 bg-walnut-500 hover:bg-walnut-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl transition">
        <i class="fas fa-comment-dots"></i>
      </button>

      <div id="michael-chat-panel" class="hidden-state fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-walnut-100 flex flex-col overflow-hidden">
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

        <div id="quick-replies" class="px-4 pb-2 flex flex-wrap gap-2 empty:hidden"></div>

        <div id="chat-photo-preview" class="px-4 pb-2 flex flex-wrap gap-2 empty:hidden"></div>

        <form id="chat-input-form" class="border-t border-walnut-100 p-3 flex items-center gap-2 bg-white">
          <label class="cursor-pointer text-walnut-400 hover:text-walnut-600 px-1" title="Upload a photo of your floor">
            <input id="chat-photo-input" type="file" accept="image/*" class="hidden">
            <i class="fas fa-camera text-lg"></i>
          </label>
          <input id="chat-text-input" type="text" placeholder="Type your message..." autocomplete="off"
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
    document.getElementById('chat-input-form').addEventListener('submit', onSubmitText)
    document.getElementById('chat-photo-input').addEventListener('change', onPhotoSelected)
  }

  function openChat() {
    state.open = true
    const panel = document.getElementById('michael-chat-panel')
    panel.classList.remove('hidden-state')
    document.getElementById('chat-fab').classList.add('hidden')
    if (state.messages.length === 0) {
      greet()
    }
  }

  function closeChat() {
    state.open = false
    document.getElementById('michael-chat-panel').classList.add('hidden-state')
    document.getElementById('chat-fab').classList.remove('hidden')
  }

  function greet() {
    addMessage('assistant', "Hi, I'm Michael, your hardwood flooring assistant. I can help you understand your options, provide a preliminary estimate, and schedule a professional evaluation. 😊")
    setTimeout(() => {
      addMessage('assistant', "What type of hardwood flooring service are you looking for?")
      renderQuickReplies([
        { label: 'Floor Sanding & Refinishing', value: 'Floor Sanding & Refinishing' },
        { label: 'Sanding + Stain + Finish', value: 'Sanding + Stain + Finish' },
        { label: 'Hardwood Floor Installation', value: 'Hardwood Floor Installation' },
        { label: 'Prefinished Hardwood Installation', value: 'Prefinished Hardwood Installation' },
        { label: 'Pergo / Laminate Installation', value: 'Pergo / Laminate Installation' },
        { label: 'Repairs', value: 'Repairs' }
      ])
    }, 400)
  }

  function addMessage(role, content, opts) {
    state.messages.push({ role, content })
    const container = document.getElementById('chat-messages')
    const bubble = el(`
      <div class="flex ${role === 'user' ? 'justify-end' : 'justify-start'}">
        <div class="chat-bubble-${role === 'user' ? 'user' : 'assistant'} px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap">${escapeHtml(content)}</div>
      </div>
    `)
    container.appendChild(bubble)
    scrollToBottom(container)
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
    scrollToBottom(container)
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator')
    if (el) el.remove()
  }

  function renderQuickReplies(options) {
    const container = document.getElementById('quick-replies')
    container.innerHTML = ''
    options.forEach((opt) => {
      const btn = el(`<button class="quick-reply-btn text-xs border border-walnut-300 text-walnut-700 rounded-full px-3 py-1.5 transition">${escapeHtml(opt.label)}</button>`)
      btn.addEventListener('click', () => {
        container.innerHTML = ''
        sendUserMessage(opt.value)
      })
      container.appendChild(btn)
    })
  }

  function clearQuickReplies() {
    document.getElementById('quick-replies').innerHTML = ''
  }

  function onSubmitText(e) {
    e.preventDefault()
    const input = document.getElementById('chat-text-input')
    const text = input.value.trim()
    if (!text || state.sending) return
    input.value = ''
    clearQuickReplies()
    sendUserMessage(text)
  }

  async function onPhotoSelected(e) {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('photo', file)

    addMessage('user', '📷 Uploading photo...')
    try {
      const res = await axios.post('/api/upload/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data && res.data.key) {
        state.photoUrls.push(res.data.key)
        renderPhotoPreview()
        addMessage('assistant', "Got it, thanks for the photo! That helps us understand your floor's condition ahead of the visit. 📸")
      }
    } catch (err) {
      addMessage('assistant', "Sorry, I couldn't upload that photo. Feel free to try again or continue without it.")
    }
    e.target.value = ''
  }

  function renderPhotoPreview() {
    const container = document.getElementById('chat-photo-preview')
    container.innerHTML = state.photoUrls
      .map((key) => `<div class="text-xs bg-forest-50 text-forest-700 rounded-full px-3 py-1"><i class="fas fa-image mr-1"></i>Photo added</div>`)
      .join('')
  }

  async function sendUserMessage(text) {
    addMessage('user', text)
    state.sending = true
    addTypingIndicator()

    try {
      const res = await axios.post('/api/chat/message', {
        messages: state.messages.map((m) => ({ role: m.role, content: m.content })),
        sessionId: getSessionId(),
        photoUrls: state.photoUrls
      })

      removeTypingIndicator()
      const data = res.data

      if (data.error) {
        addMessage('assistant', "I'm having a little trouble right now. Could you try again in a moment, or call us directly at (914) 555-0142?")
      } else {
        addMessage('assistant', data.reply || "Could you tell me a bit more?")

        if (data.estimate && !data.estimate.requiresInPersonEvaluation) {
          maybeShowBookingPrompt()
        }

        if (data.leadSubmitted) {
          state.leadSubmitted = true
        }
      }
    } catch (err) {
      removeTypingIndicator()
      addMessage('assistant', "Sorry, something went wrong on my end. Please try again, or call us at (914) 555-0142.")
    } finally {
      state.sending = false
    }
  }

  let bookingPromptShown = false
  function maybeShowBookingPrompt() {
    if (bookingPromptShown || state.leadSubmitted) return
    bookingPromptShown = true
    setTimeout(() => {
      const container = document.getElementById('chat-messages')
      const card = el(`
        <div class="flex justify-start">
          <div class="chat-bubble-assistant px-4 py-3 max-w-[90%] text-sm w-full">
            <p class="mb-2">Would you like to go ahead and schedule your free in-person evaluation?</p>
            <button id="open-booking-form-btn" class="bg-walnut-500 hover:bg-walnut-600 text-white text-xs font-semibold px-4 py-2 rounded-full">
              <i class="fas fa-calendar-check mr-1"></i> Schedule My Evaluation
            </button>
          </div>
        </div>
      `)
      container.appendChild(card)
      scrollToBottom(container)
      document.getElementById('open-booking-form-btn').addEventListener('click', showBookingForm)
    }, 300)
  }

  function showBookingForm() {
    const container = document.getElementById('chat-messages')
    const formCard = el(`
      <div class="flex justify-start">
        <div class="bg-white border border-walnut-200 rounded-xl p-4 max-w-[95%] w-full text-sm shadow-sm">
          <p class="font-semibold text-walnut-900 mb-3">Schedule Your Free Evaluation</p>
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
            <select name="appointmentDayPref" class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <option value="Monday-Friday">Monday - Friday</option>
              <option value="Saturday morning">Saturday morning</option>
            </select>
            <select name="appointmentWindow" required class="w-full border border-walnut-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Preferred time window</option>
              <option>8 AM - 11 AM</option>
              <option>11 AM - 2 PM</option>
              <option>2 PM - 5 PM</option>
            </select>
            <label class="flex items-start gap-2 text-xs text-walnut-500 pt-1">
              <input required type="checkbox" name="consentContact" class="mt-0.5">
              <span>I agree to be contacted by phone, text, or email about my project. Consent is not required for purchase. Msg &amp; data rates may apply.</span>
            </label>
            <button type="submit" class="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold py-2 rounded-lg mt-2">
              Confirm Request
            </button>
            <p id="booking-form-error" class="text-red-500 text-xs hidden"></p>
          </form>
        </div>
      </div>
    `)
    container.appendChild(formCard)
    scrollToBottom(container)

    formCard.querySelector('#booking-form').addEventListener('submit', onBookingSubmit)
  }

  async function onBookingSubmit(e) {
    e.preventDefault()
    const form = e.target
    const errorEl = form.querySelector('#booking-form-error')
    errorEl.classList.add('hidden')

    const formData = new FormData(form)
    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city'),
      appointmentDayPref: formData.get('appointmentDayPref'),
      appointmentWindow: formData.get('appointmentWindow'),
      consentContact: formData.get('consentContact') === 'on',
      photoUrls: state.photoUrls,
      conversationSummary: state.messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
      service: extractLatestService(),
      squareFootage: extractLatestSqFt()
    }

    const submitBtn = form.querySelector('button[type=submit]')
    submitBtn.disabled = true
    submitBtn.textContent = 'Sending...'

    try {
      const res = await axios.post('/api/lead/submit', payload)
      if (res.data && res.data.success) {
        form.closest('.bg-white').outerHTML = `<div class="flex justify-start"><div class="chat-bubble-assistant px-4 py-3 max-w-[85%] text-sm">✅ Thank you, ${escapeHtml(payload.name)}! Your request has been received. Our team will reach out to confirm your ${escapeHtml(payload.appointmentWindow)} appointment. We look forward to helping with your floors!</div></div>`
        state.leadSubmitted = true
      } else {
        throw new Error(res.data?.error || 'Unknown error')
      }
    } catch (err) {
      errorEl.textContent = 'Something went wrong. Please try again or call us at (914) 555-0142.'
      errorEl.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = 'Confirm Request'
    }
  }

  function extractLatestService() {
    const known = ['Floor Sanding & Refinishing', 'Sanding + Stain + Finish', 'Hardwood Floor Installation', 'Prefinished Hardwood Installation', 'Pergo / Laminate Installation', 'Repairs']
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const m = state.messages[i]
      if (m.role === 'user') {
        const found = known.find((k) => m.content.includes(k))
        if (found) return found
      }
    }
    return ''
  }

  function extractLatestSqFt() {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const m = state.messages[i]
      if (m.role === 'user') {
        const match = m.content.match(/(\d{2,5})/)
        if (match) return Number(match[1])
      }
    }
    return null
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  // Expose a global opener for CTA buttons across the site
  window.openMichaelChat = openChat

  document.addEventListener('DOMContentLoaded', renderRoot)
})()
