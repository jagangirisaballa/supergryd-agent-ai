import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
})

import { SYSTEM_PROMPT, ITINERARY_SCHEMA } from '../lib/prompts'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function testItinerary(label: string, userPrompt: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`TEST: ${label}`)
  console.log('='.repeat(60))

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_schema', json_schema: ITINERARY_SCHEMA },
    max_tokens: 16000
  })

  const parsed = JSON.parse(response.choices[0].message.content!)
  console.log(`finish_reason: ${response.choices[0].finish_reason} | tokens: ${response.usage?.completion_tokens}`)
  console.log(`total days generated: ${parsed.itinerary.length} (duration_days field: ${parsed.duration_days})\n`)

  parsed.itinerary.forEach((day: any) => {
    console.log(`Day ${day.day} [${day.city || 'NO CITY'}]: ${day.title}`)
    ;(day.schedule ?? []).forEach((block: any) => {
      console.log(`  ${block.time_block.padEnd(12)} ${block.activity_title}`)
    })
    console.log()
  })
}

async function main() {
  // TEST 1: Honeymoon Singapore 5N
  await testItinerary('HONEYMOON — Singapore 5N', `ABSOLUTE CONSTRAINT — CITIES: Build this itinerary using ONLY these exact cities: Singapore. Do not add, substitute, or invent any other city.
ABSOLUTE CONSTRAINT — DEMOGRAPHICS: 2 Adults, 0 Children, 0 Infants. Traveler types: Couple.

Create a travel itinerary for:
Destination: Singapore
Cities: Singapore
Dates/Duration: 5 nights
Passengers: 2 Adults
Traveler Types: Couple
Occasion: Honeymoon
Budget: luxury`)

  // TEST 2: Group + Seniors HCMC 5N
  await testItinerary('GROUP OF FRIENDS + SENIORS — Ho Chi Minh City 5N', `ABSOLUTE CONSTRAINT — CITIES: Build this itinerary using ONLY these exact cities: Ho Chi Minh City. Do not add, substitute, or invent any other city.
ABSOLUTE CONSTRAINT — DEMOGRAPHICS: 10 Adults, 0 Children, 0 Infants. Traveler types: Group of Friends, Seniors, Accessible/Mobility Restricted.

Create a travel itinerary for:
Destination: Vietnam
Cities: Ho Chi Minh City
Dates/Duration: 5 nights
Passengers: 10 Adults
Traveler Types: Group of Friends, Seniors, Accessible/Mobility Restricted
Occasion: Leisure/Holiday
Budget: comfort`)
}

main().catch(console.error)
