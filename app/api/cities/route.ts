import { NextRequest, NextResponse } from 'next/server'
import allCities from 'all-the-cities'

export async function GET(req: NextRequest) {
  const codes = req.nextUrl.searchParams.get('codes')
  if (!codes) return NextResponse.json([])

  const codeSet = new Set(codes.split(',').map((c) => c.trim().toUpperCase()))

  const byCountry: Record<string, { name: string; population: number }[]> = {}
  for (const city of allCities) {
    if (!codeSet.has(city.country)) continue
    if (!byCountry[city.country]) byCountry[city.country] = []
    byCountry[city.country].push({ name: city.name, population: city.population })
  }

  const result: { name: string; countryCode: string }[] = []
  for (const [code, cities] of Object.entries(byCountry)) {
    cities
      .sort((a, b) => b.population - a.population)
      .slice(0, 200)
      .forEach((c) => result.push({ name: c.name, countryCode: code }))
  }

  return NextResponse.json(result)
}
