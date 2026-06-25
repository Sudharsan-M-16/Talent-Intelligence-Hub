import express, { type Request, type Response } from 'express'
import { z } from 'zod'

const app = express()

app.use(express.json({ limit: '1mb' }))

const WebhookPayloadSchema = z
  .object({
    // MVP+ webhook should accept flexible payloads from Zapier/Make/WhatsApp bots/email parsers.
    // For correctness, require the minimum onboarding fields.
    organization_id: z.string().uuid(), // tenant scoping (MVP: derived from auth/payload later)
    full_name: z.string().min(1), // PRD: Full Name (Required)
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    linkedin_url: z.string().url().optional(),
    source: z.string().min(1).optional(),
    talent_type: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    raw: z.record(z.any()).optional(),
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: 'At least one of email or phone must be provided for duplicate detection',
    path: ['email'], // attach error to email field for readability
  })

app.post('/api/v1/profiles/webhook', async (req: Request, res: Response) => {
  const parse = WebhookPayloadSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parse.error.flatten(),
    })
  }

  // TODO (next step):
  // - derive organization_id (from payload or tenant mapping)
  // - run duplicate detection by email/phone/link
  // - map into talent_profiles columns
  // - store unmapped fields into raw_metadata JSONB
  // - insert profile and return created/duplicate status

  return res.status(201).json({
    ok: true,
    message: 'Webhook received (stub). Implement duplicate detection + upsert next.',
  })
})

const port = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`TIH API listening on http://localhost:${port}`)
})
