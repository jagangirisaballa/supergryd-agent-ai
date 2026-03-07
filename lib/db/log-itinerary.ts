import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SG-${suffix}`
}

interface LogItineraryData {
  status: 'success' | 'failed'
  input_snapshot?: Record<string, unknown>
  finish_reason?: string
  completion_tokens?: number
  actual_days?: number
  expected_days?: number
  output_json?: Record<string, unknown>
  error_message?: string
}

export async function logItinerary(data: LogItineraryData): Promise<string> {
  const id = generateId()
  await supabaseAdmin.from('itineraries').insert({ id, ...data })
  return id
}
