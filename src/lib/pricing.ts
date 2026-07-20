// ============================================================
// Michael AI — Hardwood Flooring Pricing Engine
// IMPORTANT: All pricing math happens here in code, NEVER
// left to the LLM to "calculate" — guarantees accuracy and
// consistency with the business rules defined by the client.
//
// PRICING RULES (confirmed by client, updated 2026-07-20):
// - Natural Look (always 3 coats: 1 sealer + 2 finish)  = $3.50/sq ft
// - Custom Stain + 2 coats finish                        = $3.50/sq ft
// - Custom Stain + 3 coats finish                         = $4.00/sq ft
// - Red Oak Installation 2 1/4" (labor only)               = $3.75/sq ft
// - Prefinished Hardwood Installation (labor only)         = $2.75/sq ft
// - Pergo / Laminate Installation (labor only)             = $3.00/sq ft
// NOTE: "Repairs" service removed from the guided flow — always requires
// in-person evaluation, handled as a free-text fallback in the assistant.
// ============================================================

export type ServiceKey =
  | 'sanding_refinishing_natural'
  | 'sanding_refinishing_stain'
  | 'hardwood_install'
  | 'prefinished_install'
  | 'laminate_install'

export type FinishCoats = 2 | 3

export interface ServiceDefinition {
  key: ServiceKey
  label: string
  laborOnly: boolean
  includes: string[]
  description: string
  hasFinishCoatChoice: boolean // whether the 2 vs 3 coats question applies
}

export const SERVICES: Record<ServiceKey, ServiceDefinition> = {
  sanding_refinishing_natural: {
    key: 'sanding_refinishing_natural',
    label: 'Sanding & Refinishing — Natural Look',
    laborOnly: false,
    includes: ['Complete sanding', 'One coat sealer', 'Two coats oil-based finish (3 coats total protection)'],
    description:
      'We sand down your existing floors and apply a fresh, durable natural finish to restore their true wood beauty.',
    hasFinishCoatChoice: false // natural always includes 3 coats total, no choice needed
  },
  sanding_refinishing_stain: {
    key: 'sanding_refinishing_stain',
    label: 'Sanding & Refinishing — Custom Stain',
    laborOnly: false,
    includes: ['Sanding', 'Custom stain color application', 'One coat sealer', 'Finish coats (2 or 3)'],
    description:
      'Same as our sanding & refinishing service, plus a custom stain color of your choice.',
    hasFinishCoatChoice: true
  },
  hardwood_install: {
    key: 'hardwood_install',
    label: 'Red Oak Installation 2 1/4"',
    laborOnly: true,
    includes: ['Professional installation labor (Red Oak 2 1/4")'],
    description:
      'Installation of new Red Oak 2 1/4" hardwood flooring. Labor only — material cost is separate.',
    hasFinishCoatChoice: false
  },
  prefinished_install: {
    key: 'prefinished_install',
    label: 'Prefinished Hardwood Installation',
    laborOnly: true,
    includes: ['Professional installation labor'],
    description:
      'Installation of prefinished hardwood flooring. Labor only — material cost is separate and depends on the product you choose.',
    hasFinishCoatChoice: false
  },
  laminate_install: {
    key: 'laminate_install',
    label: 'Pergo / Laminate Installation',
    laborOnly: true,
    includes: ['Professional installation labor'],
    description:
      'Installation of Pergo or laminate flooring. Labor only — material cost is separate and depends on the product you choose.',
    hasFinishCoatChoice: false
  }
}

function basePricePerSqFt(service: ServiceKey, finishCoats?: FinishCoats): number {
  switch (service) {
    case 'sanding_refinishing_natural':
      return 3.5 // always 3 coats total, no surcharge tiering
    case 'sanding_refinishing_stain':
      return finishCoats === 3 ? 4.0 : 3.5
    case 'hardwood_install':
      return 3.75
    case 'prefinished_install':
      return 2.75
    case 'laminate_install':
      return 3.0
    default:
      throw new Error('Unknown service type')
  }
}

export interface EstimateInput {
  service: ServiceKey
  squareFootage: number
  finishCoats?: FinishCoats // only relevant for sanding_refinishing_stain
}

export interface EstimateResult {
  service: ServiceDefinition
  squareFootage: number
  pricePerSqFt: number
  total: number
  laborOnly: boolean
  finishCoats?: FinishCoats
  disclaimer: string
}

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const service = SERVICES[input.service]
  if (!service) {
    throw new Error('Unknown service type')
  }

  const sqft = Math.max(0, Number(input.squareFootage) || 0)
  const pricePerSqFt = basePricePerSqFt(input.service, input.finishCoats)
  const total = Math.round(sqft * pricePerSqFt)

  return {
    service,
    squareFootage: sqft,
    pricePerSqFt,
    total,
    laborOnly: service.laborOnly,
    finishCoats: service.hasFinishCoatChoice ? input.finishCoats : undefined,
    disclaimer:
      'This estimate is based on the measurements and project details you provided. Your flooring specialist will visit to confirm measurements and floor condition — if everything matches what you told us, this is the price we honor.'
  }
}

export const REPAIRS_MESSAGE =
  'Repairs require an in-person evaluation because every situation is different. We would be happy to schedule a specialist visit at no obligation.'

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n)
}
