import { Hono } from 'hono'
import OpenAI from 'openai'
import { MICHAEL_SYSTEM_PROMPT } from '../lib/michaelPrompt'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

const chat = new Hono<{ Bindings: Bindings }>()

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Fallback free-text endpoint — used only when the customer types something
// outside the guided button wizard (the wizard handles the main flow and all
// pricing deterministically on the frontend/backend, never via the LLM).
chat.post('/message', async (c) => {
  const { env } = c
  const body = await c.req.json().catch(() => ({}))
  const history: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []

  if (!env.OPENAI_API_KEY) {
    return c.json({ error: 'AI service not configured.' }, 500)
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  })

  const messages: any[] = [{ role: 'system', content: MICHAEL_SYSTEM_PROMPT }, ...history]

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-5',
      messages
    })

    const reply = completion.choices[0]?.message?.content || "Could you tell me a bit more about your project?"
    return c.json({ reply })
  } catch (err: any) {
    console.error('Chat error:', err)
    return c.json({ error: err?.message || 'Something went wrong. Please try again.' }, 500)
  }
})

export default chat
