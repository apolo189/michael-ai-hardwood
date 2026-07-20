// Wires up all "Get Estimate / Chat" CTA buttons across the site to open the Michael AI widget.
document.addEventListener('DOMContentLoaded', () => {
  const ctaIds = [
    'open-chat-btn',
    'hero-cta-btn',
    'estimate-cta-btn',
    'final-cta-btn',
    'contact-chat-btn',
    'meet-michael-cta-btn'
  ]

  ctaIds.forEach((id) => {
    const btn = document.getElementById(id)
    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof window.openMichaelChat === 'function') {
          window.openMichaelChat()
        }
      })
    }
  })
})
