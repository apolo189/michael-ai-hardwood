import { Hono } from 'hono'

type Bindings = {
  PHOTOS: R2Bucket
}

const upload = new Hono<{ Bindings: Bindings }>()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB per photo

upload.post('/photo', async (c) => {
  const { env } = c
  const formData = await c.req.formData().catch(() => null)
  if (!formData) {
    return c.json({ error: 'Invalid form data' }, 400)
  }

  const file = formData.get('photo')
  if (!(file instanceof File)) {
    return c.json({ error: 'No photo provided' }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'Photo too large (max 10MB)' }, 400)
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: 'Unsupported file type' }, 400)
  }

  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const key = `leads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

  try {
    const buffer = await file.arrayBuffer()
    await env.PHOTOS.put(key, buffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    })

    return c.json({ key, success: true })
  } catch (err: any) {
    console.error('Upload error:', err)
    return c.json({ error: 'Failed to upload photo' }, 500)
  }
})

upload.get('/photo/:key{.+}', async (c) => {
  const { env } = c
  const key = c.req.param('key')

  const object = await env.PHOTOS.get(key)
  if (!object) {
    return c.notFound()
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000'
    }
  })
})

export default upload
