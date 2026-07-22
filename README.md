# Michael AI — Hardwood Flooring Sales Specialist (MVP v2.6 — Live on Custom Domain + Google Ads Conversion Tracking + Critical Email Fix)

## Project Overview
- **Name**: Westchester Hardwood Experts — powered by Michael AI
- **Goal**: Generate qualified hardwood flooring leads from Google Ads via a button-driven guided estimate wizard ("Michael AI") that educates homeowners, calculates a transparent, exact estimate, and hands off "hot" qualified leads to a human closer.
- **Target Areas**: New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale, Pelham (Westchester County, NY)
- **Business strategy**: **70% automation / 30% human** — Michael AI captures, educates, calculates, and qualifies. The human specialist (Luis) closes by phone or in-person visit. *"Michael AI abre la puerta. Luis cierra el trabajo."*

## What's New in v2.6 (Google Ads Conversion Tracking + Critical Lead-Notification Email Bug Fixed)
- **Google Ads conversion tracking added**: `gtag.js` base snippet loads on every page (`AW-18326378981`), and the `conversion` event (`AW-18326378981/m7o5CNr3y9QcEOWz2aJE`) fires only when a lead is successfully saved via `/api/lead/submit` — not on every page view, so Google Ads only counts real leads, not casual visits.
- **Critical bug fixed: the lead-notification email to Luis was silently failing for every real visitor.** Root cause: `sendWeb3FormsNotification()` sent the request body as JSON, which triggers a browser CORS preflight (`OPTIONS`) request — and Web3Forms rejects that preflight, so the browser cancels the whole call before it ever reaches Web3Forms. No error was shown to the visitor (the lead still saved fine to D1), but Luis never got the email or notification sound. **Fixed by switching the request body to `application/x-www-form-urlencoded`** (via `URLSearchParams`), which is a CORS "simple request" that browsers do not preflight — confirmed working end-to-end from a real browser against the production Web3Forms endpoint on the live custom domain. Checked all leads in production D1 at the time of the fix: only 2 test leads existed (no real customer leads were lost — this was caught before any real customer was affected).

## What's New in v2.5 (Custom Domain Live + Conversational Copy Polish + 500 sq ft Minimum + Prefinished Price Update)
- **Custom domain fully connected and live**: `westchesternyhardwoodfloors.com` and `www.westchesternyhardwoodfloors.com` are both verified, active, and serving HTTPS traffic with valid SSL certificates (Google Trust Services) on the `michael-ai-hardwood` Cloudflare Pages project. DNS is managed in Cloudflare (two proxied CNAME records, both pointing to `michael-ai-hardwood.pages.dev`). Confirmed zero console/JS errors on the live custom domain.
- **Conversational copy polish** ("Parsero" feedback) — Michael's guided wizard now reads like a human consultant instead of a form:
  - Service selection reply includes a short service-specific remark (e.g. *"Great choice. Sanding and refinishing is one of our most requested services."*) before moving to the next question.
  - After square footage is entered, a size-aware comment is added (small/medium/large project framing) before asking about timeline.
  - The city question is reframed as *"And just to make sure we schedule the right team for your area — which city is the project located in?"* instead of a bare form label.
  - Right before the price is revealed, Michael adds a contextualizing sentence — e.g. *"Based on what you've shared, your floors appear to be a great candidate for refinishing."* — tailored to the selected service (skipped for repairs, which have no price).
  - Purely copy/text changes — no changes to structure, pricing, or the 5-second pacing.
- **500 sq ft minimum project size (billing floor)**: Any project under 500 sq ft is now billed as if it were 500 sq ft (`MINIMUM_PROJECT_SQFT` in `src/lib/pricing.ts`), applied consistently whether the visitor types an exact square footage or uses the "I don't know" room-count/room-size fallback. The estimate result now carries both the raw `squareFootage` and the `billedSquareFootage` plus a `minimumApplied` flag, so the UI shows a transparent note (*"Your project (X sq ft) is billed at our 500-sq-ft minimum, which covers setup, materials, and travel for smaller jobs."*) instead of a silent price bump, and the email notification to Luis includes the same note.
- **Prefinished Hardwood Installation price updated**: **$2.75/sq ft → $3.50/sq ft**. Updated in both the pricing engine (`src/lib/pricing.ts`) and the landing page's Services grid display copy (`src/routes/pages.ts`), so the two stay in sync.

## What's New in v2.4 (Consultant Conversation Flow + Critical Bug Fix + Hero Polish)
- **Chat flow completely redesigned to feel consultative, not transactional.** Previous flow (service → sqft → instant price, ~10 seconds) felt like a calculator. New flow (`chat-widget.js`, "Consultant Flow v3"):
  1. Greeting + framing message ("Before I calculate your investment, I'd like to understand your project...")
  2. **Q1 — Project type**: Sanding Natural / Sanding Custom Stain / New Hardwood Installation (→ sub-step: Red Oak / Prefinished / Pergo-Laminate) / **Repair Hardwood Floors** (new — never priced online, routes straight to a "free in-person evaluation" card)
  3. **Q2 — Square footage**: numeric input, OR **"I don't know my square footage"** → fallback asks room count (1/2/3/4+) then room size (Small/Medium/Large) and silently computes an internal estimate (120/200/300 sq ft per room) — no ranges are ever shown to the visitor
  4. **Q3 — Timeline** (new): ASAP / Within 1 Week / Within 2 Weeks / Within 30 Days
  5. **Q4 — City** (new): dropdown, pre-fills the booking form's city field later
  6. Brief pause → **estimate card** (unchanged pricing engine/calculation, exact same `/api/estimate/calculate`) → disclaimer → "What would you like to do next?" → Schedule My Visit / Call Me Now / **Ask Michael Another Question** (new 3rd option, re-opens free-text input)
  - **Every assistant reply now waits a minimum of 5 seconds** (`THINKING_DELAY_MS = 5000`), shown with a visible typing indicator, before appearing — plus a short natural acknowledgment before each next question. Total conversation now takes ~45-60 seconds instead of ~10, so Michael feels like an experienced consultant qualifying the project rather than an instant-answer form. This pacing applies to both the guided wizard and the free-text fallback (`/api/chat/message`).
  - `timeline` is included in the Web3Forms email notification but intentionally **not** persisted to D1 (no new column/migration) to keep the change scoped to the conversation layer only.
  - **Pricing engine, calculation logic, branding, colors, avatar, email notifications, and booking/schedule/call buttons were left completely untouched**, per explicit requirement.
- **Critical bug fixed: chat widget was silently broken in production.** While testing the hero change, discovered (via `node --check` + Playwright console capture) that `chat-widget.js` had a JS syntax error from a leftover `sed` cleanup mistake during the earlier photo-upload removal — this had been live in production since that commit, meaning the entire chat widget had been non-functional for site visitors until this was caught and fixed. Verified with `node --check`, rebuilt, and confirmed zero console errors on the live production URL after redeploying.
- **Hero before/after photos enlarged**, and the **"30+ Years Hardwood Experience" badge moved off the photos** (it previously floated as an overlapping card covering part of the images) into a text pill above the headline. Purely a CSS/layout change — no content or pricing logic touched.

## What's New in v2.3 (Production Deployment + Photo Upload Removed)
- **Deployed to Cloudflare Pages** (Luis's own Cloudflare account, BYOK) — project `michael-ai-hardwood`, live at `https://michael-ai-hardwood.pages.dev` (custom domain pending).
- **Production D1 database created and migrated** — `michael-ai-hardwood-production`, both migrations applied via `--remote`. Leads are now being saved to a real production database.
- **Photo upload step removed entirely** — Luis visits every lead in person to verify measurements and floor condition, so uploading photos beforehand added no value. This also removes the need for Cloudflare R2 (avoids the extra one-time "Enable R2" account setup). Removed: the wizard's photo-upload step (`chat-widget.js`), the `/api/upload` route (`src/routes/upload.ts`, deleted), the `PHOTOS` R2 binding (`src/index.tsx`, `wrangler.jsonc`). The `photos_json` DB column is harmlessly left in place, always storing `"[]"`.
- **Web3Forms email notification fixed for the free plan** — Web3Forms' free plan only allows client-side (browser) calls, not server-side/API calls. The lead is still always saved to D1 first (source of truth via `/api/lead/submit`), then the notification email is sent directly from the visitor's browser (`sendWeb3FormsNotification()` in `chat-widget.js`) using an Access Key safely injected into the page (`window.WEB3FORMS_ACCESS_KEY` — Web3Forms' own docs confirm this key is designed to be public/client-side).
- **Code pushed to GitHub** — `https://github.com/apolo189/michael-ai-hardwood` (branch `main`).

## What's New in v2.2 (Conversion Polish — "Shark Sees Blood" CTA)
Follow-up design feedback: the CTA needed to be impossible to ignore, and the site needed to reduce friction by showing "how easy" the process is.
- **CTA copy strengthened**: "Get My Estimate" → **"Get My Estimate Now"** on all 3 primary buttons (hero, calculator teaser, final CTA) and the floating chat button.
- **New "As Easy as 1-2-3" section** right after the hero — 3 numbered steps (Answer a few quick questions → Get your exact price instantly → Schedule your visit or request a call) to reduce friction before the visitor even opens the chat.
- **"Powered by Michael AI" badge added directly in the Hero** — a short line under the CTA button (`Powered by Michael AI — get your exact price in minutes, before anyone visits your home`) so Michael AI's core value proposition is visible on first scroll, not just in its own section further down.
- **Primary CTA now uses the `gold` accent color** (previously walnut-brown, blending into the rest of the page) with a **pulsing glow animation** (`.cta-pulse` in `style.css`) — a soft scale + expanding ring effect that draws the eye without being obnoxious. Applied only to the hero CTA, final CTA, and the floating chat button (the calculator CTA stays forest-green so only the highest-priority actions "pulse" — if everything glowed, nothing would stand out).
- **Floating chat button (FAB) redesigned**: now shows text ("Get My Estimate Now") next to the icon on desktop (icon-only circle on mobile to save space), gold color, same pulse animation — always visible while scrolling.

## What's New in v2.1 (Emotional Design Pass)
Landing page design review feedback: the site was "clean and professional but missing the emotional wow factor." Response, without touching the existing premium structure:
- **New emotional headline**: *"Your Floors Aren't Old. They're Forgotten."* (replaces the more literal "Bring Your Hardwood Floors Back To Life").
- **New "Pain Points" section** (dark walnut background, right after the hero) — names the homeowner's real feelings (pet damage, scratches, dull floors that lost their beauty) before presenting the solution ("We bring them back to life."). Creates emotional contrast before the "Old Way vs Our Way" section.
- **New "Meet Michael AI" section** — a dedicated, high-contrast (forest-to-walnut gradient) section that sells the "wow" of instant pricing before a visit. Uses an **AI-generated illustrated/vector avatar icon** for Michael AI — deliberately abstract/graphic, NOT a photorealistic human face, to avoid misrepresenting a real person (Google Ads / FTC risk — "Michael" is the AI assistant's name, not a real staff member).
- **More color contrast**: added a `gold` accent color (`gold-400`/`gold-500`) to the Tailwind config, used sparingly (Michael AI CTA button, hero "30+ Years" badge) plus the new dark walnut/forest gradient sections for visual rhythm — the page no longer feels uniformly beige/brown.
- **Regenerated before/after hero images** with more dramatic emotional contrast: the "before" floor now looks genuinely tired/worn/neglected (dim lighting, dull gray-brown tone, visible scratches) vs. the previous version which looked too "polished portfolio". The "after" image was regenerated to match the same room/composition for a believable pair. Disclaimer text unchanged ("Representative example — actual results vary by project.").
- **Removed all "Licensed & insured" claims** (Trust section card + footer tagline) — this was an unconfirmed credential. Replaced with neutral, honest copy ("Careful, detail-oriented work"). **Action item**: if Luis confirms the business is actually licensed & insured, this badge can be safely reinstated with that real credential.
- **Explicitly decided NOT to add a real human photo/bio for "Michael"** — Michael AI is the assistant's name, not a real person, and using a photo/bio would misrepresent business identity (Google Ads compliance + legal risk). The "Meet Michael AI" section leans into this being an AI advisor as the actual differentiator, instead of faking a human specialist.

## What's New in v2 (Strategic Pivot)
- **80% buttons / 20% free text** — the estimate flow is now a deterministic, guided wizard (vanilla JS state machine), not an open LLM conversation. The LLM is only used as a **fallback** for off-script free-text questions (e.g. repair inquiries, general questions) via `/api/chat/message`. It never touches pricing.
- **Exact square footage input** (no ranges) to preserve the "same price in person" transparency promise.
- **New finalized pricing** (see table below) — simpler, no low/high ranges, exact totals only.
- **Repairs removed as a formal/button service, and removed from the static Services grid entirely.** There is no button, no card, no online pricing, and no formal step for repairs anywhere on the landing page. If a customer types about a repair in the free-text fallback, Michael AI always redirects to an in-person, no-obligation evaluation with a fixed message — never a number. (Repairs are still mentioned informationally in the FAQ and Terms of Service as "not priced online", which is expected — no button/card/price is ever shown.)
- **Before/After emotional imagery** in the hero section (AI-generated), with a Google Ads–compliant disclaimer: *"Representative example — actual results vary by project."*
- **New "Old Way vs Our Way" section** — process-focused differentiation. **No named competitors are ever mentioned or compared against**, in the UI or in the AI's fallback responses (legal / Google Ads risk).
- **New CTA hierarchy**: Primary = 🟤 **"Get My Estimate"**, Secondary = 📞 **"Call Now"**. Phone is never the forced first step — it's always offered as an equal option only **after** the guided estimate completes, via *"Would you like to speak with a flooring specialist?"* → **"Schedule My Visit"** or **"Call Me Now"**.

## Pricing (Deterministic Backend — `src/lib/pricing.ts` — UNCHANGED since v2, including in v2.4's conversation-flow redesign)
| Service | Price | Notes |
|---|---|---|
| Sanding & Refinishing — Natural Look | **$3.50/sq ft** | Always 3 coats total (1 sealer + 2 finish), fixed, no coat choice |
| Sanding & Refinishing — Custom Stain, 2 coats | **$3.50/sq ft** | |
| Sanding & Refinishing — Custom Stain, 3 coats | **$4.00/sq ft** | Extra durability, longer drying time |
| Red Oak Installation 2 1/4" | **$3.75/sq ft** | Labor only, material separate |
| Prefinished Hardwood Installation | **$3.50/sq ft** | Labor only, material separate (updated 2026-07-21, was $2.75) |
| Pergo / Laminate Installation | **$3.00/sq ft** | Labor only, material separate |
| Repairs | *No online price* | Now a formal Q1 button ("Repair Hardwood Floors") as of v2.4, but still never priced — always routes to a no-obligation in-person evaluation card |

The AI **never** invents a price. All totals are calculated by `calculateEstimate()` in `src/lib/pricing.ts` and returned as an exact whole-dollar total (`Math.round(billedSqft * pricePerSqFt)`), never a range.

**500 sq ft minimum billing floor**: Any project under 500 sq ft is billed as if it were 500 sq ft (`MINIMUM_PROJECT_SQFT = 500`). This applies to every service above. The estimate response includes `billedSquareFootage` (what's actually charged) and `minimumApplied` (boolean) alongside the original `squareFootage` (what the customer entered), so the UI/email can show a transparent "minimum applied" note rather than a silent price increase.

## Features Completed ✅
- **Premium landing page** — Hero with before/after transformation imagery + compliance disclaimer + dual CTA (Get My Estimate / Call Now), Trust section, "Old Way vs Our Way" section, Services grid, Service Areas, FAQ, final dual CTA
- **Michael AI guided wizard** (floating widget, bottom-right), 100% deterministic front-end state machine — "Consultant Flow v3" (see v2.4 section above for full detail):
  1. Greeting + framing message, paced with a 5-second minimum "thinking" delay before every reply
  2. Q1 — service type (4 buttons: Natural, Custom Stain, New Installation → sub-step Red Oak/Prefinished/Laminate, **Repair**) + "Something else?" free-text link
  3. Finish coats (2 vs 3 buttons) — only shown for Custom Stain
  4. Q2 — square footage (numeric input, or "I don't know" → room count + room size fallback, no ranges shown)
  5. Q3 — timeline (ASAP / 1 week / 2 weeks / 30 days)
  6. Q4 — city (dropdown)
  7. Estimate card with exact total, price/sq ft, and transparency disclaimer (repairs instead get a "free in-person evaluation" card, no price)
  8. Post-estimate handoff: **"Schedule My Visit"** / **"Call Me Now"** / **"Ask Michael Another Question"** → booking form (day/window fields hidden when "Call Me Now" is chosen, city pre-filled from Q4) → TCPA consent checkbox → submit
  - Free-text input always available at the bottom for off-script questions (also paced with the same 5-second minimum delay) → routed to the LLM fallback (`/api/chat/message`), which never invents prices and never compares to named competitors
- **Pricing calculator** (`src/lib/pricing.ts`) — deterministic backend, see table above
- **Appointment request** — fixed time windows only (8-11AM / 11AM-2PM / 2PM-5PM, Mon-Fri + optional Sat morning); omitted entirely when the lead chooses "Call Me Now" instead of scheduling a visit
- **Lead capture & notification**:
  - Leads persisted in Cloudflare D1 (`leads` table), including `finish_coats`, `estimate_total`, `wants_call_now` (v2 schema, migration `0002_pricing_v2.sql`)
  - Notification sent via **Web3Forms**, called directly from the browser (client-side, per Web3Forms' free-plan requirement) right after the lead is saved to D1 — includes whether the lead wants an immediate call (for phone-closing) or a scheduled visit
  - Real TCPA-style **consent checkbox** in the booking form (not left to the AI to infer)
- **Google Ads compliance groundwork**:
  - Dedicated Privacy Policy (`/privacy-policy`), Terms of Service (`/terms-of-service`), Accessibility Statement (`/accessibility`)
  - Clear business identity (name, phone, service area) in header/footer on every page
  - Transparent pricing language ("estimated investment", never "final price")
  - Before/after imagery disclaimer ("Representative example — actual results vary")
  - No named competitor mentions or comparisons anywhere (UI or AI fallback)
  - Explicit contact consent language for phone/text outreach
  - No misleading claims, no intrusive popups, HTTPS via Cloudflare Pages, mobile responsive

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Landing page |
| GET | `/privacy-policy`, `/terms-of-service`, `/accessibility`, `/about`, `/contact` | Legal & info pages |
| POST | `/api/chat/message` | Free-text fallback only (off-script questions, repairs). Body: `{ messages: [{role,content}] }` → `{ reply }`. No tool-calling, never sets pricing. |
| GET | `/api/estimate/services` | List of the 5 formal services with metadata |
| POST | `/api/estimate/calculate` | Body: `{ service, squareFootage, finishCoats? }` → exact deterministic estimate (`{ total, pricePerSqFt, ... }`) |
| POST | `/api/lead/submit` | Structured lead submission (requires `name` + phone/email + `consentContact: true`). Body includes `wantsCallNow`, `estimateTotal`, `finishCoats` → saves to D1. The frontend then sends the Web3Forms email notification directly from the browser. |

## Data Architecture
- **D1 Database** (`michael-ai-hardwood-production`, id `c4390bab-6ac2-4895-b04d-477cf75ecd13`) — table `leads` (name, phone, email, address, city, service, square_footage, finish_option, **finish_coats**, **estimate_total**, labor_only, appointment_day_pref, appointment_window, photos_json *(always `[]`, no longer collected)*, conversation_summary, consent_contact, **wants_call_now**, status, created_at) and `chat_sessions` (unused in v2 flow)
- **Web3Forms** — outbound email notification service (no SMTP available on Cloudflare Workers), called client-side from the browser (free-plan requirement)
- **Static images** — `public/static/images/floor-before.jpg` / `floor-after.jpg` (AI-generated, v2.1 regenerated for more emotional contrast, optimized to ~185-190KB JPEGs), `michael-ai-avatar.jpg` (AI-generated illustrated/vector icon, ~21KB, deliberately non-photorealistic)

## ⚠️ Pending / Not Yet Configured
1. **Real business name and Gmail** — phone number is confirmed real: **(914) 316-2170**, updated everywhere (header, footer, hero, calculator CTA, final CTA, FAQ, legal pages, chat widget error messages). Still placeholder:
   - Business name: "Westchester Hardwood Experts"
   - Email: info@westchesterhardwoodexperts.com
   - **Update these in `src/lib/layout.ts` and `src/routes/pages.ts` once confirmed.**

## Recommended Next Steps
1. Confirm real business name / email and update site copy.
2. Now that the custom domain is live, set up Google Ads conversion tracking (gtag) and submit the site for Google Ads review.
3. Second iteration ideas: SMS confirmation, calendar sync for appointment windows, admin dashboard to view leads (with a "wants call now" priority flag for Luis), A/B testing hero copy, optionally persist `timeline` to D1 if Luis wants it queryable/reportable later.

## User Guide
1. Visit the landing page. Click **"Get My Estimate"** (primary CTA) or the chat bubble (bottom-right) to open **Michael AI**.
2. Michael introduces himself and briefly explains he wants to understand the project first (a few seconds' pause — this is intentional, so it feels like a real consultant, not a form).
3. Pick your project type (Natural, Custom Stain, New Installation → Red Oak/Prefinished/Laminate, or Repair).
4. If Custom Stain, pick 2 or 3 coats.
5. Enter your exact square footage, or tap **"I don't know"** and answer room count + room size instead — Michael works out an estimate for you.
6. Answer how soon you'd like to start, and which city the project is in.
7. After a brief pause, Michael shows your **exact estimated investment** — never a "final price", always with a transparency disclaimer. (If you selected Repair, Michael instead offers a free in-person evaluation — repairs are never priced online.)
8. Choose **"Schedule My Visit"**, **"Call Me Now"**, or **"Ask Michael Another Question"** — for booking, fill in your name, phone, and check the consent box, then submit.
9. Your request is saved and the business is notified by email — including your timeline and whether you want an immediate call or a scheduled visit.
10. For anything off-script, type it in the free-text box at the bottom — Michael will always offer a free in-person evaluation instead of guessing a price for repairs.

## Deployment
- **Platform**: Cloudflare Pages (Hono + TypeScript + Tailwind CDN), deployed to Luis's own Cloudflare account (BYOK)
- **Production URL**: https://westchesternyhardwoodfloors.com (custom domain, live with valid SSL) — also reachable at https://www.westchesternyhardwoodfloors.com and the underlying https://michael-ai-hardwood.pages.dev
- **GitHub**: https://github.com/apolo189/michael-ai-hardwood (branch `main`)
- **Status**: ✅ **Deployed and live in production on the custom domain** — verified end-to-end (landing page, estimate calculator, lead submission all saving to production D1, v3 chat flow with conversational copy polish, 500 sq ft minimum, and updated Prefinished pricing all live with zero console/JS errors on the custom domain)
- **Tech Stack**: Hono, Cloudflare D1, OpenAI-compatible LLM (`gpt-5` via Genspark proxy, fallback-only, no tool-calling), Web3Forms for email notifications (client-side call)
- **Last Updated**: 2026-07-22 (v2.6 — Google Ads conversion tracking added, critical lead-notification email bug fixed)
