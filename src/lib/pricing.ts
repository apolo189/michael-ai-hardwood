// ============================================================
// Michael AI — Hardwood Flooring Pricing Engine
// IMPORTANT: All pricing math happens here in code, NEVER
// left to the LLM to "calculate" — guarantees accuracy and
// consistency with the business rules defined by the client.
// ============================================================

export type ServiceKey =
  | 'sanding_refinishing'
  | 'sanding_stain_finish'
  | 'prefinished_install'
  | 'laminate_install'
  | 'hardwood_install'
  | 'repairs'

export interface ServiceDefinition {
  key: ServiceKey
  label: string
  basePricePerSqFt: number | null // null => repairs, no online pricing
  laborOnly: boolean
  includes: string[]
  description: string
}

export const SERVICES: Record<ServiceKey, ServiceDefinition> = {
  sanding_refinishing: {
    key: 'sanding_refinishing',
    label: 'Floor Sanding & Refinishing',
    basePricePerSqFt: 3.0,
    laborOnly: false,
    includes: [
      'Complete sanding',
      'One coat sealer',
      'Two coats oil-based finish (3 coats total protection)'
    ],
    description:
      'We sand down your existing floors and apply a fresh, durable finish to restore their natural beauty.'
  },
  sanding_stain_finish: {
    key: 'sanding_stain_finish',
    label: 'Sanding + Stain + Finish',
    basePricePerSqFt: 3.5,
    laborOnly: false,
    includes: [
      'Sanding',
      'Stain application (custom color)',
      'One coat sealer',
      'Two coats oil-based finish'
    ],
    description:
      'Same as our sanding & refinishing service, plus a custom stain color of your choice.'
  },
  prefinished_install: {
    key: 'prefinished_install',
    label: 'Prefinished Hardwood Installation',
    basePricePerSqFt: 2.5,
    laborOnly: true,
    includes: ['Professional installation labor'],
    description:
      'Installation of prefinished hardwood flooring. Labor only — material cost is separate and depends on the product you choose.'
  },
  laminate_install: {
    key: 'laminate_install',
    label: 'Pergo / Laminate Installation',
    basePricePerSqFt: 2.5,
    laborOnly: true,
    includes: ['Professional installation labor'],
    description:
      'Installation of Pergo or laminate flooring. Labor only — material cost is separate and depends on the product you choose.'
  },
  hardwood_install: {
    key: 'hardwood_install',
    label: 'Hardwood Installation + Sanding + Finish',
    basePricePerSqFt: 4.5,
    laborOnly: true,
    includes: ['Installation', 'Sanding', 'Finish application labor'],
    description:
      'Full installation of new hardwood flooring, including sanding and finishing. Labor only — material cost is separate.'
  },
  repairs: {
    key: 'repairs',
    label: 'Repairs',
    basePricePerSqFt: null,
    laborOnly: true,
    includes: [],
    description:
      'Repairs require an in-person evaluation because every situation is different. We would be happy to schedule a specialist visit.'
  }
}

export interface EstimateInput {
  service: ServiceKey
  squareFootage: number
  extraCoat?: boolean // true => 3 coats instead of 2 (only relevant for refinishing services)
}

export interface EstimateResult {
  service: ServiceDefinition
  squareFootage: number
  pricePerSqFt: number | null
  low: number | null
  high: number | null
  laborOnly: boolean
  requiresInPersonEvaluation: boolean
  disclaimer: string
}

const EXTRA_COAT_SURCHARGE_PER_SQFT = 0.35 // additional protection coat surcharge

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const service = SERVICES[input.service]

  if (!service) {
    throw new Error('Unknown service type')
  }

  if (service.key === 'repairs' || service.basePricePerSqFt === null) {
    return {
      service,
      squareFootage: input.squareFootage,
      pricePerSqFt: null,
      low: null,
      high: null,
      laborOnly: true,
      requiresInPersonEvaluation: true,
      disclaimer:
        'Repairs require an in-person evaluation because every situation is different. We would be happy to schedule a specialist visit.'
    }
  }

  const sqft = Math.max(0, Number(input.squareFootage) || 0)
  let pricePerSqFt = service.basePricePerSqFt

  if (input.extraCoat && (service.key === 'sanding_refinishing' || service.key === 'sanding_stain_finish')) {
    pricePerSqFt += EXTRA_COAT_SURCHARGE_PER_SQFT
  }

  const exact = sqft * pricePerSqFt
  // Provide a small transparent range (+/-5%) since this is a preliminary estimate
  const low = Math.round(exact * 0.95)
  const high = Math.round(exact * 1.05)

  return {
    service,
    squareFootage: sqft,
    pricePerSqFt,
    low,
    high,
    laborOnly: service.laborOnly,
    requiresInPersonEvaluation: false,
    disclaimer:
      'Our estimates are based on the information you provide, including measurements and project details. If the square footage and floor condition match the information provided, this is the same pricing you can expect after our specialist evaluation. Our visit is only to verify measurements, evaluate floor condition, and make sure there are no surprises.'
  }
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n)
}
