'use client'

import { useState, useEffect } from 'react'
import CountrySelector from '../../components/CountrySelector'
import CitySelector from '../../components/CitySelector'
import TravelDates, { TravelDatesValue } from '../../components/TravelDates'
import TravelerDetails from '../../components/TravelerDetails'
import PaxSelector from '../../components/PaxSelector'
import BudgetSelector from '../../components/BudgetSelector'
import GeneratingScreen from '../../components/GeneratingScreen'

interface ScheduleBlock {
  time_block: string
  activity_title: string
  activity_narrative: string
  ticketing_and_logistics: string
  demographic_catering_note: string | null
  verified: boolean
  verified_note: string | null
  maps_link: string | null
  duration_mins: number | null
}

interface DayMetrics {
  fatigue_level: number
  cultural_score: number
  adventure_score: number
  occasion_conformity: number
}

interface DayPlan {
  day: number
  title: string
  hotel: string | null
  meals_included: string | null
  flight_disclaimer: string | null
  day_metrics: DayMetrics
  schedule: ScheduleBlock[]
}

interface OverallMetrics {
  trust_score: number
  avg_fatigue: number
  total_activities: number
  verified_count: number
  unverified_count: number
}

interface Itinerary {
  destination: string
  duration_days: number
  pax_summary: string
  itinerary: DayPlan[]
  overall_metrics: OverallMetrics
}

export default function ItineraryGenerator() {
  const [selectedCountries, setSelectedCountries] = useState<{code:string;name:string;emoji:string}[]>([])
  const [selectedCities, setSelectedCities] = useState<{name:string;countryCode:string}[]>([])
  const [travelDates, setTravelDates] = useState<TravelDatesValue>({ startDate: null, endDate: null, arrivalTime: '', departureTime: '', nights: null })
  const [travelerDetails, setTravelerDetails] = useState<{ travelerTypes: string[]; otherTraveler: string; occasion: string }>({ travelerTypes: [], otherTraveler: '', occasion: '' })
  const [pax, setPax] = useState({ adults: 2, children: 0, infants: 0 })
  const [budget, setBudget] = useState('comfort')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [attempt, setAttempt] = useState<1 | 2 | 3>(1)
  const [result, setResult] = useState<Itinerary | null>(null)
  const [itineraryId, setItineraryId] = useState<string | null>(null)

  useEffect(() => {
    const codes = new Set(selectedCountries.map(c => c.code))
    setSelectedCities(prev => prev.filter(c => codes.has(c.countryCode)))
  }, [selectedCountries])

  // Drive attempt display by elapsed time while loading
  useEffect(() => {
    if (!loading) return
    const t2 = setTimeout(() => setAttempt(2), 40000)
    const t3 = setTimeout(() => setAttempt(3), 75000)
    return () => { clearTimeout(t2); clearTimeout(t3) }
  }, [loading])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setRetryable(false)
    setResult(null)
    setItineraryId(null)
    setAttempt(1)

    if (selectedCountries.length === 0) {
      setError('Please select at least one destination country.')
      return
    }
    if (travelDates.nights === null && travelDates.startDate === null) {
      setError('Please select travel dates or number of nights.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: selectedCountries.map(c => c.name).join(', '),
          cities: selectedCities.map(c => c.name).join(', '),
          dates: (() => {
            if (travelDates.nights) return `${travelDates.nights} nights`
            const { startDate, endDate, arrivalTime, departureTime } = travelDates
            if (!startDate) return ''
            const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            let s = `${fmt(startDate)}${endDate ? ' to ' + fmt(endDate) : ''}`
            if (arrivalTime) s += `, arriving ${arrivalTime}`
            if (departureTime) s += `, departing ${departureTime}`
            return s
          })(),
          pax: `${pax.adults} Adults, ${pax.children} Children, ${pax.infants} Infants`,
          travelerTypes: travelerDetails.travelerTypes.join(', '),
          occasion: travelerDetails.occasion,
          budget,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Generation failed. Please try again.')
        setRetryable(data.retryable === true)
        return
      }

      setResult(data.itinerary)
      setItineraryId(data.id ?? null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Itinerary Generator</h1>
        <p className="text-sm text-slate-500 mb-6">Fill in the trip details below to generate a day-by-day itinerary.</p>

        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <CountrySelector value={selectedCountries} onChange={setSelectedCountries} />
            </div>
            <div>
              <CitySelector selectedCountries={selectedCountries} value={selectedCities} onChange={setSelectedCities} />
            </div>

          </div>

          <div>
            <TravelDates value={travelDates} onChange={setTravelDates} />
          </div>

          <div>
            <TravelerDetails
              travelerTypes={travelerDetails.travelerTypes}
              otherTraveler={travelerDetails.otherTraveler}
              occasion={travelerDetails.occasion}
              onChange={(field, value) => setTravelerDetails(prev => ({ ...prev, [field]: value }))}
            />
          </div>

          <div>
            <PaxSelector
              adults={pax.adults}
              children={pax.children}
              infants={pax.infants}
              onChange={(field, value) => setPax(prev => ({ ...prev, [field]: value }))}
            />
          </div>

          <div>
            <BudgetSelector value={budget} onChange={setBudget} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? 'Generating…' : 'Generate Itinerary'}
          </button>
        </form>
      </div>

      {/* Error banner */}
      {error && !loading && !retryable && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 mb-0.5">Generation failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => { setError(''); setLoading(false); }}
            className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Retryable error card */}
      {error && !loading && retryable && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-6 flex flex-col gap-4">
          <p className="text-sm text-amber-800">{error}</p>
          <button
            type="button"
            onClick={(e) => { setError(''); setRetryable(false); handleGenerate(e as any); }}
            className="self-start px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition"
          >
            Yes, bump me up! 🚀
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <GeneratingScreen
          selectedCountries={selectedCountries}
          budget={budget}
          occasion={travelerDetails.occasion}
          travelerTypes={travelerDetails.travelerTypes}
          attempt={attempt}
        />
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Itinerary header */}
          <div className="bg-blue-600 rounded-2xl p-6 sm:p-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold">{result.destination}</h2>
              {itineraryId && (
                <span className="font-mono text-xs text-blue-300 mt-1 flex-shrink-0">ID: {itineraryId}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-blue-100 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="opacity-70">Duration</span>
                <span className="font-medium text-white">{result.duration_days} days</span>
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1.5">
                <span className="opacity-70">Travellers</span>
                <span className="font-medium text-white">{result.pax_summary}</span>
              </span>
            </div>
          </div>

          {/* Overall metrics bar */}
          {result.overall_metrics && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex flex-wrap gap-5 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Trust Score</span>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  result.overall_metrics.trust_score >= 80
                    ? 'bg-emerald-100 text-emerald-700'
                    : result.overall_metrics.trust_score >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {result.overall_metrics.trust_score}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Fatigue</span>
                <span className="text-sm font-bold text-slate-700">{result.overall_metrics.avg_fatigue}/10</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activities</span>
                <span className="text-sm font-bold text-slate-700">{result.overall_metrics.total_activities}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  ✅ {result.overall_metrics.verified_count} verified
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                  ⚠️ {result.overall_metrics.unverified_count} unverified
                </span>
              </div>
            </div>
          )}

          {/* Day cards */}
          {result.itinerary.map((day) => (
            <div key={day.day} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Flight disclaimer banner */}
              {day.flight_disclaimer && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-start gap-2 text-xs text-amber-800">
                  <span className="flex-shrink-0">✈️</span>
                  <span>{day.flight_disclaimer}</span>
                </div>
              )}

              {/* Day header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {day.day}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{day.title}</h3>
                  {/* Day Analysis */}
                  {day.day_metrics && (
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                      <h4 className="font-semibold text-slate-800 mb-3">Day Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Fatigue Level:</span>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${day.day_metrics.fatigue_level <= 3 ? 'bg-emerald-500' : day.day_metrics.fatigue_level <= 6 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${day.day_metrics.fatigue_level * 10}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 w-8 flex-shrink-0 text-right">{day.day_metrics.fatigue_level}/10</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Cultural Score:</span>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full bg-blue-500"
                              style={{ width: `${day.day_metrics.cultural_score * 10}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 w-8 flex-shrink-0 text-right">{day.day_metrics.cultural_score}/10</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Adventure Score:</span>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full bg-orange-500"
                              style={{ width: `${day.day_metrics.adventure_score * 10}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 w-8 flex-shrink-0 text-right">{day.day_metrics.adventure_score}/10</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Vibe Match %:</span>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full bg-purple-500"
                              style={{ width: `${day.day_metrics.occasion_conformity}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 w-8 flex-shrink-0 text-right">{day.day_metrics.occasion_conformity}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Day meta */}
              {(day.hotel || day.meals_included) && (
                <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                  {day.hotel && day.hotel.toLowerCase() !== 'null' && (
                    <span className="flex items-center gap-2">
                      <span><span className="font-medium text-slate-700">Hotel:</span> {day.hotel}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.hotel + ' ' + result.destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        📍 View on Maps
                      </a>
                    </span>
                  )}
                  {day.meals_included && (
                    <span>
                      <span className="font-medium text-slate-700">Meals:</span> {day.meals_included}
                    </span>
                  )}
                </div>
              )}

              {/* Schedule blocks */}
              <ul className="divide-y divide-slate-100">
                {(day.schedule ?? []).map((block, i) => {
                  const cityName = result.destination.split(',')[0].trim()
                  const isMeal = /lunch|dinner|breakfast|cafe|restaurant|dining|eatery|food/i.test(block.activity_title) ||
                    /lunch|dinner|breakfast/i.test(block.time_block)
                  const mealType = /breakfast/i.test(block.activity_title + block.time_block) ? 'breakfast'
                    : /lunch/i.test(block.activity_title + block.time_block) ? 'lunch'
                    : 'dinner'
                  const mealCopy = {
                    breakfast: 'Start your morning right — your agent will recommend the best breakfast spots.',
                    lunch: 'Your agent will curate a memorable midday dining experience.',
                    dinner: 'An evening meal worth remembering — your agent will handpick the finest options.',
                  }[mealType]
                  const conciergeMapUrl = `https://www.google.com/maps/search/${encodeURIComponent(block.activity_title + ' ' + result.destination)}`

                  return (
                  <li key={i} className="px-6 py-5">
                    {/* Time block + verified */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{block.time_block}</span>
                      <div className="flex items-center gap-2">
                        {block.duration_mins && (
                          <span className="text-xs text-slate-400">{block.duration_mins} min</span>
                        )}
                        {block.verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">✅ Verified</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">⚠️ Unverified</span>
                        )}
                      </div>
                    </div>

                    {/* Title + maps link */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
                      <span className="font-semibold text-slate-800 text-sm">{block.activity_title}</span>
                      {block.maps_link && (
                        <a href={block.maps_link} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                          📍 View on Maps
                        </a>
                      )}
                    </div>

                    {/* Narrative */}
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">{block.activity_narrative}</p>

                    {/* Logistics */}
                    <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">📋 Logistics: </span>
                      {block.ticketing_and_logistics}
                    </div>

                    {/* Verified note */}
                    {!block.verified && block.verified_note && (
                      <p className="mt-1.5 text-xs text-slate-400 italic">{block.verified_note}</p>
                    )}

                    {/* Demographic note */}
                    {block.demographic_catering_note && (
                      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                        <span className="font-semibold">👶 Note: </span>
                        {block.demographic_catering_note}
                      </div>
                    )}

                    {/* Concierge dining card */}
                    {!block.maps_link && isMeal && (
                      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                        <p className="text-xs text-amber-800 italic mb-2">🍽️ {mealCopy}</p>
                        <a
                          href={conciergeMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-700 font-medium hover:text-amber-900 hover:underline"
                        >
                          → Browse restaurants in {cityName}
                        </a>
                      </div>
                    )}
                  </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
