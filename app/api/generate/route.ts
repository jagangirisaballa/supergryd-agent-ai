import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { SYSTEM_PROMPT, ITINERARY_SCHEMA } from '@/lib/prompts'
import { scoreItinerary } from '@/lib/itinerary-scorer'
import { createClient } from '@/lib/supabase/server'
import { logItinerary } from '@/lib/db/log-itinerary'

async function continueItinerary(
  openai: OpenAI,
  existingDays: any[],
  fromDay: number,
  toDay: number,
  userPrompt: string,
  attempt: number
): Promise<any[]> {
  console.log(`[ATTEMPT ${attempt}/3] Continuing from Day ${fromDay} to Day ${toDay}`)

  const continuationPrompt = `You are continuing a partially generated travel itinerary.

Days already generated:
${JSON.stringify(existingDays, null, 2)}

Now generate Days ${fromDay} through ${toDay} for this trip.
Original trip context:
${userPrompt}

IMPORTANT:
- Do NOT repeat any days already listed above.
- Start from Day ${fromDay} and generate through Day ${toDay}.
- Each day object must match the exact same schema as the existing days.
- Return valid JSON in this exact format: { "itinerary": [ <day objects> ] }`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: continuationPrompt }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 16000
  })

  console.log(`[ATTEMPT ${attempt}/3] finish_reason: ${response.choices[0].finish_reason}, tokens: ${response.usage?.completion_tokens}`)

  const content = response.choices[0].message.content
  const parsed = JSON.parse(content!)
  return parsed.itinerary ?? []
}

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

    // Parse requestedNights
    let requestedNights: number | null = null
    const nightsMatch = dates?.match(/(\d+)\s*nights?/i)
    if (nightsMatch) {
      requestedNights = parseInt(nightsMatch[1])
    } else if (dates?.includes(' to ')) {
      const parts = dates.split(' to ')
      const start = new Date(parts[0])
      const end = new Date(parts[1].split(',')[0])
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        requestedNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }
    }
    const expectedDays = requestedNights !== null ? requestedNights + 1 : null

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

    console.log('[ATTEMPT 1/3] Finish Reason:', finishReason)
    console.log('[ATTEMPT 1/3] Usage Tokens:', { prompt_tokens: response.usage?.prompt_tokens, completion_tokens: completionTokens, total_tokens: totalTokens })
    console.log('Raw Content Length:', response.choices[0].message.content?.length)
    console.log('[RAW CONTENT FIRST 500]', response.choices[0].message.content?.substring(0, 500))

    if (finishReason === 'length') {
      const errorMessage = `[DIAG] Response truncated by model. finish_reason: length. completion_tokens hit max_tokens limit of ${completionTokens}. Total tokens: ${totalTokens}. Reduce trip length or nights.`
      const id = await logItinerary({ status: 'failed', input_snapshot: inputSnapshot, finish_reason: finishReason, completion_tokens: completionTokens, error_message: errorMessage, attempt_count: 1 })
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
      const id = await logItinerary({ status: 'failed', input_snapshot: inputSnapshot, finish_reason: finishReason, completion_tokens: completionTokens, error_message: errorMessage, attempt_count: 1 })
      return NextResponse.json({ error: errorMessage, id }, { status: 500 })
    }

    // Retry loop for incomplete itineraries
    let attempt = 1
    if (expectedDays !== null) {
      while ((parsed.itinerary?.length ?? 0) < expectedDays && attempt < 3) {
        attempt++
        const fromDay = (parsed.itinerary?.length ?? 0) + 1
        console.log(`[RETRY NEEDED] actualDays: ${parsed.itinerary?.length ?? 0}, expectedDays: ${expectedDays}, attempt: ${attempt}`)
        try {
          const newDays = await continueItinerary(openai, parsed.itinerary ?? [], fromDay, expectedDays, userPrompt, attempt)
          parsed.itinerary = [...(parsed.itinerary ?? []), ...newDays]
        } catch (retryErr: any) {
          console.log(`[ATTEMPT ${attempt}/3] Continuation failed: ${retryErr.message}`)
          break
        }
      }
    }

    const actualDays = parsed.itinerary?.length ?? 0
    console.log('Days Check:', { actualDays, expectedDays, requestedNights })

    if (!parsed.itinerary || parsed.itinerary.length === 0) {
      return NextResponse.json(
        { error: `[DIAG] Zero days generated. finish_reason: ${response.choices[0].finish_reason}. Tokens: ${response.usage?.completion_tokens}/${response.usage?.total_tokens}. Content length: ${response.choices[0].message.content?.length} chars.` },
        { status: 422 }
      )
    }

    if (expectedDays !== null && actualDays < expectedDays) {
      const errorMessage = `[DIAG] Incomplete after ${attempt} attempts. Got ${actualDays}/${expectedDays} days.`
      await logItinerary({ status: 'failed', input_snapshot: inputSnapshot, finish_reason: finishReason, completion_tokens: completionTokens, actual_days: actualDays, expected_days: expectedDays, error_message: errorMessage, attempt_count: attempt })
      return NextResponse.json({
        error: "Looks like our AI travel planners are working overtime right now! 🌍 I can bump your request up the queue if you'd like — shall I do it?",
        retryable: true
      }, { status: 503 })
    }

    const scored = scoreItinerary(parsed, { hasInfants, hasSeniors, occasion: occasion ?? '' })

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
      actual_days: scored.itinerary?.length ?? 0,
      expected_days: expectedDays ?? scored.duration_days,
      output_json: scored as unknown as Record<string, unknown>,
      attempt_count: attempt,
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
