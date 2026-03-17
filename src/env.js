import { z } from "zod"

const EnvSchema = z.object({
  PORT: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  AI_TTS_WEBHOOK_URL: z.string().url().optional()
})

export const env = EnvSchema.parse(process.env)

