# Michael AI — Hardwood Flooring Sales Specialist (MVP)

## Project Overview
- **Name**: Westchester Hardwood Experts — powered by Michael AI
- **Goal**: Generate qualified hardwood flooring leads from Google Ads via an AI conversational sales specialist ("Michael AI") that educates homeowners, calculates a transparent preliminary estimate, and books an in-person evaluation.
- **Target Areas**: New Rochelle, Larchmont, Mamaroneck, Rye, Scarsdale, Pelham (Westchester County, NY)

## Features Completed ✅
- **Premium landing page** — Hero, Trust section (30+ yrs experience, honest pricing, professional evaluation, quality craftsmanship), Services grid, Service Areas, FAQ, final CTA
- **Michael AI chatbot** (floating widget, bottom-right):
  - Human, friendly, non-technical tone
  - Max 2 questions per turn, never asks about budget
  - Full conversation flow: greeting → service type → refinishing sub-options (natural/stain) → finish coats (2 vs 3) → square footage → estimate → photo upload prompt → appointment booking
  - **Repairs** always redirected to in-person evaluation (no online pricing)
  - Uses OpenAI-compatible LLM (`gpt-5` via Genspark LLM proxy) with **function/tool calling** — the AI never invents numbers; pricing math always goes through the backend calculator
- **Pricing calculator** (`src/lib/pricing.ts`) — deterministic backend logic per business rules:
  - Sanding & Refinishing: $3.00/sq ft
  - Sanding + Stain + Finish: $3.50/sq ft
  - Prefinished Hardwood Installation: $2.50/sq ft (labor only)
  - Pergo/Laminate Installation: $2.50/sq ft (labor only)
  - Hardwood Installation + Sanding + Finish: $4.50/sq ft (labor only)
  - Repairs: no online price, in-person evaluation required
  - 3-coat finish adds a transparent surcharge
- **Photo upload** — stored in Cloudflare R2, referenced by key in the lead record
- **Appointment request** — fixed time windows only (8-11AM / 11AM-2PM / 2PM-5PM, Mon-Fri + optional Sat morning), no arbitrary times
- **Lead capture & notification**:
  - Leads persisted in Cloudflare D1 (`leads` table)
  - Notification sent via **Web3Forms** (`WEB3FORMS_ACCESS_KEY`) to the business Gmail, subject "🔥 NEW HARDWOOD LEAD", includes name/phone/email/address/city/service/sqft/estimate/photos/appointment/conversation summary
  - Real TCPA-style **consent checkbox** in the booking form (not left to the AI to infer)
- **Google Ads compliance groundwork**:
  - Dedicated Privacy Policy (`/privacy-policy`) and Terms of Service (`/terms-of-service`) pages, linked in every page footer
  - Accessibility Statement (`/accessibility`)
  - Clear business identity (name, phone, service area) in header/footer on every page
  - Transparent pricing language ("estimated investment", never "final price")
  - Explicit contact consent language for phone/text outreach
  - No misleading claims, no intrusive popups, HTTPS via Cloudflare Pages, mobile responsive

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Landing page |
| GET | `/privacy-policy`, `/terms-of-service`, `/accessibility`, `/about`, `/contact` | Legal & info pages |
| POST | `/api/chat/message` | Michael AI conversation turn. Body: `{ messages: [{role,content}], sessionId, photoUrls }` |
| GET | `/api/estimate/services` | List of services with base pricing |
| POST | `/api/estimate/calculate` | Body: `{ service, squareFootage, extraCoat }` → deterministic estimate |
| POST | `/api/upload/photo` | multipart/form-data `photo` file → stored in R2, returns `{ key }` |
| GET | `/api/upload/photo/:key` | Serves an uploaded photo from R2 |
| POST | `/api/lead/submit` | Structured lead submission (requires `consentContact: true`) → saves to D1 + sends Web3Forms email |

## Data Architecture
- **D1 Database** (`michael-ai-hardwood-production`) — table `leads` (name, phone, email, address, city, service, square_footage, finish_option, estimate_low/high, labor_only, appointment_day_pref, appointment_window, photos_json, conversation_summary, consent_contact, status, created_at) and `chat_sessions`
- **R2 Bucket** (`michael-ai-hardwood-photos`) — customer-uploaded floor photos, key format `leads/<timestamp>-<rand>.<ext>`
- **Web3Forms** — outbound email notification service (no SMTP available on Cloudflare Workers)

## ⚠️ Pending / Not Yet Configured
1. **`WEB3FORMS_ACCESS_KEY`** — needs the Access Key from a **new, dedicated** Web3Forms form (separate from any other project's form) tied to the business Gmail. Currently empty in `.dev.vars`; lead notification will silently log an error until this is set.
2. **Registered domain name** — required before running Google Ads (Cloudflare `*.pages.dev` subdomains are not accepted by Google Ads). Site is ready to connect to a custom domain via Cloudflare Pages once purchased.
3. **Real business name, phone, and Gmail** — placeholder values currently in use:
   - Business name: "Westchester Hardwood Experts"
   - Phone: (914) 555-0142
   - Email: info@westchesterhardwoodexperts.com
   - **Update these in `src/lib/layout.ts` and `src/routes/pages.ts` once confirmed.**
4. **Production Cloudflare deployment** — D1/R2 currently created only in local dev mode; production `database_id` in `wrangler.jsonc` is a placeholder and must be set when deploying (via the Cloudflare deploy skill).
5. **Hero/section images** — currently sourced via web search (Creative Commons filtered); consider replacing with real project photos once available.

## Recommended Next Steps
1. Get the Web3Forms Access Key (new form, not shared with other projects) and add it as a Cloudflare secret + local `.dev.vars` value.
2. Confirm real business name / phone / email and update site copy.
3. Purchase and connect a registered domain (required for Google Ads compliance).
4. Deploy to Cloudflare Pages production (create real D1 database + R2 bucket in the Cloudflare account, run migrations).
5. Second iteration ideas: SMS confirmation, calendar sync for appointment windows, admin dashboard to view leads, A/B testing hero copy, Google Ads conversion tracking (gtag) once domain is live.

## User Guide
1. Visit the landing page. Click **"Get My Hardwood Floor Estimate"** (or the chat bubble, bottom-right) to open **Michael AI**.
2. Answer up to 2 questions per turn: service type → refinishing sub-options (if applicable) → square footage.
3. Michael calculates and presents a transparent estimate range (never a "final price").
4. Optionally upload a photo of the floor.
5. Click **"Schedule My Evaluation"**, fill in contact info, pick a day preference + time window, check the consent box, and submit.
6. The lead is saved and an email notification is sent to the business Gmail via Web3Forms.

## Deployment
- **Platform**: Cloudflare Pages (Hono + TypeScript + Tailwind CDN)
- **Status**: ✅ Running locally in sandbox (PM2 + `wrangler pages dev`) — ❌ Not yet deployed to production Cloudflare
- **Tech Stack**: Hono, Cloudflare D1, Cloudflare R2, OpenAI-compatible LLM (gpt-5 via Genspark proxy) with function calling, Web3Forms for email notifications
- **Last Updated**: 2026-07-20
