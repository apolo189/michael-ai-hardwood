import { Hono } from 'hono'
import OpenAI from 'openai'
import { MICHAEL_SYSTEM_PROMPT } from '../lib/michaelPrompt'
import { calculateEstimate, ServiceKey } from '../lib/pricing'
import { sendLeadNotification } from '../lib/webhook'

type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  WEB3FORMS_ACCESS_KEY: string
}

const chat = new Hono<{ Bindings: Bindings }>()

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculate_estimate',
      description:
        'Calculates the preliminary hardwood flooring estimate based on service type, square footage, and finish options. Always use this instead of manual math.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            enum: [
              'sanding_refinishing',
              'sanding_stain_finish',
              'prefinished_install',
              'laminate_install',
              'hardwood_install',
              'repairs'
            ],
            description: 'The hardwood flooring service selected by the customer'
          },
          squareFootage: {
            type: 'number',
            description: 'Approximate square footage of the project'
          },
          extraCoat: {
            type: 'boolean',
            description: 'True if the customer chose 3 coats of finish instead of 2 (only for refinishing services)'
          }
        },
        required: ['service', 'squareFootage']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'submit_lead',
      description:
        'Submits the qualified lead to the sales team via email notification. Call this once you have collected enough information (name + phone or email, service, square footage, estimate, and ideally an appointment window).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          city: {
            type: 'string',
            enum: ['New Rochelle', 'Larchmont', 'Mamaroneck', 'Rye', 'Scarsdale', 'Pelham', 'Other']
          },
          service: { type: 'string' },
          squareFootage: { type: 'number' },
          finishOption: { type: 'string' },
          estimateLow: { type: 'number' },
          estimateHigh: { type: 'number' },
          laborOnly: { type: 'boolean' },
          appointmentDayPref: { type: 'string', description: 'e.g. Monday-Friday or Saturday' },
          appointmentWindow: {
            type: 'string',
            enum: ['8 AM - 11 AM', '11 AM - 2 PM', '2 PM - 5 PM']
          },
          conversationSummary: { type: 'string', description: 'Brief summary of the conversation and project needs' },
          consentContact: { type: 'boolean', description: 'True if the customer explicitly agreed to be contacted by phone/text' }
        },
        required: ['name', 'service', 'squareFootage']
      }
    }
  }
]

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: any[]
  name?: string
}

chat.post('/message', async (c) => {
  const { env } = c
  const body = await c.req.json().catch(() => ({}))
  const history: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
  const sessionId: string | undefined = body.sessionId
  const photoUrls: string[] = Array.isArray(body.photoUrls) ? body.photoUrls : []

  if (!env.OPENAI_API_KEY) {
    return c.json({ error: 'AI service not configured. Please set OPENAI_API_KEY.' }, 500)
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  })

  const messages: any[] = [{ role: 'system', content: MICHAEL_SYSTEM_PROMPT }, ...history]

  let leadSubmitted: any = null
  let lastEstimate: any = null

  try {
    // Allow up to 4 rounds of tool calling before returning to user
    for (let round = 0; round < 4; round++) {
      const completion = await client.chat.completions.create({
        model: 'gpt-5',
        messages,
        tools,
        tool_choice: 'auto'
      })

      const choice = completion.choices[0]
      const msg = choice.message

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls })

        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name
          let args: any = {}
          try {
            args = JSON.parse(toolCall.function.arguments || '{}')
          } catch {}

          let toolResult: any = {}

          if (fnName === 'calculate_estimate') {
            const estimate = calculateEstimate({
              service: args.service as ServiceKey,
              squareFootage: Number(args.squareFootage) || 0,
              extraCoat: !!args.extraCoat
            })
            lastEstimate = estimate
            toolResult = {
              serviceLabel: estimate.service.label,
              pricePerSqFt: estimate.pricePerSqFt,
              estimateLow: estimate.low,
              estimateHigh: estimate.high,
              laborOnly: estimate.laborOnly,
              requiresInPersonEvaluation: estimate.requiresInPersonEvaluation,
              disclaimer: estimate.disclaimer
            }
          } else if (fnName === 'submit_lead') {
            const result = await handleSubmitLead(env, args, photoUrls, sessionId)
            leadSubmitted = { ...args, photoUrls }
            toolResult = result
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          })
        }
        continue // let the model respond to tool results
      }

      // No tool calls — final assistant message for this turn
      return c.json({
        reply: msg.content || '',
        estimate: lastEstimate,
        leadSubmitted: !!leadSubmitted
      })
    }

    return c.json({
      reply: "Let me get that information ready for you — could you confirm your details so I can finalize your estimate?",
      estimate: lastEstimate,
      leadSubmitted: !!leadSubmitted
    })
  } catch (err: any) {
    console.error('Chat error:', err)
    return c.json({ error: err?.message || 'Something went wrong. Please try again.' }, 500)
  }
})

async function handleSubmitLead(env: Bindings, args: any, photoUrls: string[], sessionId?: string) {
  // Persist to D1
  try {
    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, address, city, service, square_footage, finish_option, estimate_low, estimate_high, labor_only, appointment_day_pref, appointment_window, photos_json, conversation_summary, consent_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        args.name || null,
        args.phone || null,
        args.email || null,
        args.address || null,
        args.city || null,
        args.service || null,
        args.squareFootage ?? null,
        args.finishOption || null,
        args.estimateLow ?? null,
        args.estimateHigh ?? null,
        args.laborOnly ? 1 : 0,
        args.appointmentDayPref || null,
        args.appointmentWindow || null,
        JSON.stringify(photoUrls || []),
        args.conversationSummary || null,
        args.consentContact ? 1 : 0
      )
      .run()
  } catch (err) {
    console.error('DB insert error:', err)
  }

  // Send email notification via Web3Forms
  const notifyResult = await sendLeadNotification(env.WEB3FORMS_ACCESS_KEY, {
    name: args.name,
    phone: args.phone,
    email: args.email,
    address: args.address,
    city: args.city,
    service: args.service,
    squareFootage: args.squareFootage,
    finishOption: args.finishOption,
    estimateLow: args.estimateLow,
    estimateHigh: args.estimateHigh,
    laborOnly: args.laborOnly,
    appointmentDayPref: args.appointmentDayPref,
    appointmentWindow: args.appointmentWindow,
    photoUrls,
    conversationSummary: args.conversationSummary,
    consentContact: args.consentContact
  })

  return {
    saved: true,
    notified: notifyResult.ok,
    notifyError: notifyResult.error
  }
}

export default chat
