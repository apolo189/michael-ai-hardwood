# Michael AI — Hardwood Flooring Sales Specialist (MVP v2.2 — Conversion Polish)

## Project Overview
- **Name**: Westchester Hardwood Experts — powered by Michael AI
- **Goal**: Generate qualified hardwood flooring leads from Google Ads via a button-driven guided estimate wizard ("Michael AI") that educates homeowners, calculates a transparent, exact estimate, and hands off "hot" qualified leads to a human closer.
- **Target Areas**: New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale, Pelham (Westchester County, NY)
- **Business strategy**: **70% automation / 30% human** — Michael AI captures, educates, calculates, and qualifies. The human specialist (Luis) closes by phone or in-person visit. *"Michael AI abre la puerta. Luis cierra el trabajo."*

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

## Pricing (Deterministic Backend — `src/lib/pricing.ts`)
| Service | Price | Notes |
|---|---|---|
| Sanding & Refinishing — Natural Look | **$3.50/sq ft** | Always 3 coats total (1 sealer + 2 finish), fixed, no coat choice |
| Sanding & Refinishing — Custom Stain, 2 coats | **$3.50/sq ft** | |
| Sanding & Refinishing — Custom Stain, 3 coats | **$4.00/sq ft** | Extra durability, longer drying time |
| Red Oak Installation 2 1/4" | **$3.75/sq ft** | Labor only, material separate |
| Prefinished Hardwood Installation | **$2.75/sq ft** | Labor only, material separate |
| Pergo / Laminate Installation | **$3.00/sq ft** | Labor only, material separate |
| Repairs | *No online price* | Free-text fallback only → always redirects to a no-obligation in-person evaluation |

The AI **never** invents a price. All totals are calculated by `calculateEstimate()` in `src/lib/pricing.ts` and returned as an exact whole-dollar total (`Math.round(sqft * pricePerSqFt)`), never a range.

## Features Completed ✅
- **Premium landing page** — Hero with before/after transformation imagery + compliance disclaimer + dual CTA (Get My Estimate / Call Now), Trust section, "Old Way vs Our Way" section, Services grid, Service Areas, FAQ, final dual CTA
- **Michael AI guided wizard** (floating widget, bottom-right), 100% deterministic front-end state machine:
  1. Greeting → service type (5 buttons: Natural, Custom Stain, Red Oak Install, Prefinished Install, Pergo/Laminate) + "Something else?" free-text link
  2. Finish coats (2 vs 3 buttons) — only shown for Custom Stain
  3. Exact square footage (numeric input, no ranges)
  4. Optional photo upload (skip allowed)
  5. Instant estimate card with exact total, price/sq ft, and transparency disclaimer
  6. Post-estimate handoff: **"Schedule My Visit"** vs **"Call Me Now"** (equal-weight buttons) → booking form (day/window fields hidden when "Call Me Now" is chosen) → TCPA consent checkbox → submit
  - Free-text input always available at the bottom for off-script questions (repairs, general questions) → routed to the LLM fallback (`/api/chat/message`), which never invents prices and never compares to named competitors
- **Pricing calculator** (`src/lib/pricing.ts`) — deterministic backend, see table above
- **Photo upload** — stored in Cloudflare R2, referenced by key in the lead record
- **Appointment request** — fixed time windows only (8-11AM / 11AM-2PM / 2PM-5PM, Mon-Fri + optional Sat morning); omitted entirely when the lead chooses "Call Me Now" instead of scheduling a visit
- **Lead capture & notification**:
  - Leads persisted in Cloudflare D1 (`leads` table), including `finish_coats`, `estimate_total`, `wants_call_now` (v2 schema, migration `0002_pricing_v2.sql`)
  - Notification sent via **Web3Forms** (`WEB3FORMS_ACCESS_KEY`) — includes whether the lead wants an immediate call (for phone-closing) or a scheduled visit
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
| POST | `/api/upload/photo` | multipart/form-data `photo` file → stored in R2, returns `{ key }` |
| GET | `/api/upload/photo/:key` | Serves an uploaded photo from R2 |
| POST | `/api/lead/submit` | Structured lead submission (requires `name` + phone/email + `consentContact: true`). Body includes `wantsCallNow`, `estimateTotal`, `finishCoats` → saves to D1 + sends Web3Forms email |

## Data Architecture
- **D1 Database** (`michael-ai-hardwood-production`) — table `leads` (name, phone, email, address, city, service, square_footage, finish_option, **finish_coats**, **estimate_total**, labor_only, appointment_day_pref, appointment_window, photos_json, conversation_summary, consent_contact, **wants_call_now**, status, created_at) and `chat_sessions` (unused in v2 flow)
- **R2 Bucket** (`michael-ai-hardwood-photos`) — customer-uploaded floor photos, key format `leads/<timestamp>-<rand>.<ext>`
- **Web3Forms** — outbound email notification service (no SMTP available on Cloudflare Workers)
- **Static images** — `public/static/images/floor-before.jpg` / `floor-after.jpg` (AI-generated, v2.1 regenerated for more emotional contrast, optimized to ~185-190KB JPEGs), `michael-ai-avatar.jpg` (AI-generated illustrated/vector icon, ~21KB, deliberately non-photorealistic)

## ⚠️ Pending / Not Yet Configured
1. **`WEB3FORMS_ACCESS_KEY`** — needs the Access Key from a **new, dedicated** Web3Forms form (separate from any other project's form) tied to the business Gmail. Currently empty in `.dev.vars`; lead notification currently returns `notified: false, notifyError: "WEB3FORMS_ACCESS_KEY not configured"` (confirmed via local testing) until this is set. **Leads still save correctly to D1 regardless.**
2. **Registered domain name** — required before running Google Ads (Cloudflare `*.pages.dev` subdomains are not accepted by Google Ads). Site is ready to connect to a custom domain via Cloudflare Pages once purchased.
3. **Real business name and Gmail** — phone number is now confirmed real: **(914) 316-2170**, updated everywhere (header, footer, hero, calculator CTA, final CTA, FAQ, legal pages, chat widget error messages). Still placeholder:
   - Business name: "Westchester Hardwood Experts"
   - Email: info@westchesterhardwoodexperts.com
   - **Update these in `src/lib/layout.ts` and `src/routes/pages.ts` once confirmed.**
4. **Production Cloudflare deployment** — D1/R2 currently created only in local dev mode; production `database_id` in `wrangler.jsonc` is a placeholder and must be set when deploying (via the Cloudflare deploy skill).

## Recommended Next Steps
1. Get the Web3Forms Access Key (new form, not shared with other projects) and add it as a Cloudflare secret + local `.dev.vars` value.
2. Confirm real business name / email and update site copy.
3. Purchase and connect a registered domain (required for Google Ads compliance).
4. Deploy to Cloudflare Pages production (create real D1 database + R2 bucket in the Cloudflare account, run migrations).
5. Second iteration ideas: SMS confirmation, calendar sync for appointment windows, admin dashboard to view leads (with a "wants call now" priority flag for Luis), A/B testing hero copy, Google Ads conversion tracking (gtag) once domain is live.

## User Guide
1. Visit the landing page. Click **"Get My Estimate"** (primary CTA) or the chat bubble (bottom-right) to open **Michael AI**.
2. Pick your project type from the buttons (Natural, Custom Stain, Red Oak Install, Prefinished, Pergo/Laminate).
3. If Custom Stain, pick 2 or 3 coats.
4. Enter your exact square footage.
5. Optionally upload photos of your floor (or skip).
6. Michael instantly shows your **exact estimated investment** — never a "final price", always with a transparency disclaimer.
7. Choose **"Schedule My Visit"** or **"Call Me Now"** — fill in your name, phone, and check the consent box, then submit.
8. Your request is saved and the business is notified (via Web3Forms email, once configured) — including whether you want an immediate call or a scheduled visit.
9. For anything off-script (e.g. repairs), type it in the free-text box at the bottom — Michael will always offer a free in-person evaluation instead of guessing a price.

## Deployment
- **Platform**: Cloudflare Pages (Hono + TypeScript + Tailwind CDN)
- **Status**: ✅ Running locally in sandbox (PM2 + `wrangler pages dev`), fully tested end-to-end for v2 — ❌ Not yet deployed to production Cloudflare
- **Tech Stack**: Hono, Cloudflare D1, Cloudflare R2, OpenAI-compatible LLM (`gpt-5` via Genspark proxy, fallback-only, no tool-calling in v2), Web3Forms for email notifications
- **Last Updated**: 2026-07-20 (v2 pricing/wizard rebuild)
