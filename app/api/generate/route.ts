import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { SYSTEM_PROMPT, ITINERARY_SCHEMA } from '@/lib/prompts'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { destination, dates, travellers, tripStyle } = await request.json()

  const userPrompt = `Create a travel itinerary for:
Destination: ${destination}
Dates/Duration: ${dates}
Travellers: ${travellers}
${tripStyle ? `Trip Style: ${tripStyle}` : ''}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_schema', json_schema: ITINERARY_SCHEMA },
    max_tokens: 4000
  })

  const itinerary = JSON.parse(response.choices[0].message.content!)

  // Log to Supabase
  await supabase.from('session_logs').update({
    itineraries_generated: 1,
    mode_used: 'generation'
  }).eq('agent_id', user.id)

  return NextResponse.json({ itinerary })
}
