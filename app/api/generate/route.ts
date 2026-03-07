import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { SYSTEM_PROMPT, ITINERARY_SCHEMA } from '@/lib/prompts'
import { scoreItinerary } from '@/lib/itinerary-scorer'
import { createClient } from '@/lib/supabase/server'
import { logItinerary } from '@/lib/db/log-itinerary'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { destination, cities, dates, pax, travelerTypes, occasion, budget } = body
  const inputSnapshot = { destination, cities, dates, pax, travelerTypes, occasion, budget }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const finishReason = response.choices[0].finish_reason
    const completionTokens = response.usage?.completion_tokens
    const totalTokens = response.usage?.total_tokens

    console.log('Finish Reason:', finishReason)
    console.log('Usage Tokens:', { prompt_tokens: response.usage?.prompt_tokens, completion_tokens: completionTokens, total_tokens: totalTokens })
    console.log('Raw Content Length:', response.choices[0].message.content?.length)
    console.log('[RAW CONTENT FIRST 500]', response.choices[0].message.content?.substring(0, 500))

    if (finishReason === 'length') {
      const errorMessage = `[DIAG] Response truncated by model. finish_reason: length. completion_tokens hit max_tokens limit of ${completionTokens}. Total tokens: ${totalTokens}. Reduce trip length or nights.`
      const id = await logItinerary({ status: 'failed', input_snapshot: inputSnapshot, finish_reason: finishReason, completion_tokens: completionTokens, error_message: errorMessage })
      return NextResponse.json({ error: errorMessage, id }, { status: 422 })
    }

    const content = response.choices[0].message.content
    let parsed: any
    try {
      parsed = JSON.parse(content!)
      const allBlocks = parsed.itinerary?.flatMap((d: any) => d.schedule ?? []) ?? []
      const verifiedWithMaps = allBlocks.filter((s: any) => s.verified === true && s.maps_link)
      const verifiedWithoutMaps = allBlocks.filter((s: any) => s.verified === true && !s.maps_link)
      const unverifiedWithMaps = allBlocks.filter((s: any) => s.verified === false && s.maps_link)
      console.log('[MAPS AUDIT]', JSON.stringify({
        total_blocks: allBlocks.length,
        verified_with_maps: verifiedWithMaps.length,
        verified_without_maps: verifiedWithoutMaps.map((s: any) => s.activity_title),
        unverified_with_maps: unverifiedWithMaps.length
      }))
    } catch (e) {
      const errorMessage = `[DIAG] JSON parse failed. finish_reason: ${finishReason}. Content length: ${content?.length} chars. completion_tokens: ${completionTokens}. First 200 chars: ${content?.substring(0, 200)}`
      const id = await logItinerary({ status: 'failed', input_snapshot: inputSnapshot, finish_reason: finishReason, completion_tokens: completionTokens, error_message: errorMessage })
      return NextResponse.json({ error: errorMessage, id }, { status: 500 })
    }

    const scored = scoreItinerary(parsed, { hasInfants, hasSeniors, occasion: occasion ?? '' })

    const actualDays = scored.itinerary?.length ?? 0
    console.log('Days Check:', { actualDays, expectedDays: scored.duration_days })

    if (!scored.itinerary || scored.itinerary.length === 0) {
      return NextResponse.json(
        { error: `[DIAG] Zero days generated. finish_reason: ${response.choices[0].finish_reason}. Tokens: ${response.usage?.completion_tokens}/${response.usage?.total_tokens}. Content length: ${response.choices[0].message.content?.length} chars.` },
        { status: 422 }
      )
    }

    // Log to Supabase session log
    await supabase.from('session_logs').update({
      itineraries_generated: 1,
      mode_used: 'generation'
    }).eq('agent_id', user.id)

    const id = await logItinerary({
      status: 'success',
      input_snapshot: inputSnapshot,
      finish_reason: finishReason,
      completion_tokens: completionTokens,
      actual_days: actualDays,
      expected_days: scored.duration_days,
      output_json: scored as unknown as Record<string, unknown>,
    })

    return NextResponse.json({ itinerary: scored, id })
  } catch (e: any) {
    const errorMessage = `[DIAG] Unhandled exception: ${e.message}. Stack: ${e.stack?.split('\n')[1]}`
    try {
      const id = await logItinerary({ status: 'failed', input_snapshot: inputSnapshot, error_message: errorMessage })
      return NextResponse.json({ error: errorMessage, id }, { status: 500 })
    } catch {
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }
}
