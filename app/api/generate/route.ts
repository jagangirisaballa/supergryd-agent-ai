import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { SYSTEM_PROMPT, ITINERARY_SCHEMA } from '@/lib/prompts'
import { scoreItinerary } from '@/lib/itinerary-scorer'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { destination, cities, dates, pax, travelerTypes, occasion, budget } = await request.json()

    // Parse pax counts for context
    const infantsMatch = pax?.match(/(\d+)\s*infants?/)
    const infants = infantsMatch ? parseInt(infantsMatch[1]) : 0
    const hasSeniors = (travelerTypes ?? '').toLowerCase().includes('senior')
    const hasInfants = infants > 0 || (travelerTypes ?? '').toLowerCase().includes('infant') || (travelerTypes ?? '').toLowerCase().includes('toddler')

    const cityConstraint = cities
      ? `ABSOLUTE CONSTRAINT — CITIES: Build this itinerary using ONLY these exact cities: ${cities}. Do not add, substitute, or invent any other city.`
      : `ABSOLUTE CONSTRAINT — CITIES: Build this itinerary using ONLY cities within: ${destination}. Do not add, substitute, or invent any other city.`

    const demographicConstraint = `ABSOLUTE CONSTRAINT — DEMOGRAPHICS: ${pax ?? ''}. Traveler types: ${travelerTypes ?? 'not specified'}. ${hasInfants ? 'Infants/toddlers present: maximum 2 schedule blocks per day, mandatory afternoon rest block.' : ''}`

    const userPrompt = `${cityConstraint}
${demographicConstraint}

Create a travel itinerary for:
Destination: ${destination}
Cities: ${cities || 'use best cities for destination'}
Dates/Duration: ${dates}
Passengers: ${pax}
Traveler Types: ${travelerTypes || 'not specified'}
Occasion: ${occasion || 'not specified'}
Budget: ${budget || 'comfort'}`

    console.log('User Prompt:', userPrompt)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_schema', json_schema: ITINERARY_SCHEMA },
      max_tokens: 16000
    })

    console.log('Finish Reason:', response.choices[0].finish_reason)
    console.log('Usage Tokens:', { prompt_tokens: response.usage?.prompt_tokens, completion_tokens: response.usage?.completion_tokens, total_tokens: response.usage?.total_tokens })
    console.log('Raw Content Length:', response.choices[0].message.content?.length)

    if (response.choices[0].finish_reason === 'length') {
      return NextResponse.json(
        { error: `[DIAG] Response truncated by model. finish_reason: length. completion_tokens hit max_tokens limit of ${response.usage?.completion_tokens}. Total tokens: ${response.usage?.total_tokens}. Reduce trip length or nights.` },
        { status: 422 }
      )
    }

    const content = response.choices[0].message.content
    let parsed: any
    try {
      parsed = JSON.parse(content!)
    } catch (e) {
      return NextResponse.json({ error: `[DIAG] JSON parse failed. finish_reason: ${response.choices[0].finish_reason}. Content length: ${content?.length} chars. completion_tokens: ${response.usage?.completion_tokens}. First 200 chars: ${content?.substring(0, 200)}` }, { status: 500 })
    }

    const scored = scoreItinerary(parsed, { hasInfants, hasSeniors, occasion: occasion ?? '' })

    const actualDays = scored.itinerary?.length ?? 0
    console.log('Days Check:', { actualDays, expectedDays: scored.duration_days })
    if (!scored.itinerary || scored.itinerary.length === 0) {
      return NextResponse.json(
        { error: `[DIAG] Zero days generated. finish_reason: ${response.choices[0].finish_reason}. Tokens used: ${response.usage?.completion_tokens}/${response.usage?.total_tokens}. Content length: ${content?.length} chars.` },
        { status: 422 }
      )
    }

    // Log to Supabase
    await supabase.from('session_logs').update({
      itineraries_generated: 1,
      mode_used: 'generation'
    }).eq('agent_id', user.id)

    return NextResponse.json({ itinerary: scored })
  } catch (e: any) {
    return NextResponse.json(
      { error: `[DIAG] Unhandled exception: ${e.message}. Stack: ${e.stack?.split('\n')[1]}` },
      { status: 500 }
    )
  }
}
