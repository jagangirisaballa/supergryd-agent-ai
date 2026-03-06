'use client'

import { useState } from 'react'

interface Activity {
  name: string
  maps_link: string | null
  verified: boolean
  verified_note: string | null
  duration_mins: number | null
  notes: string | null
}

interface DayPlan {
  day: number
  title: string
  description: string
  hotel: string | null
  meals_included: string | null
  activities: Activity[]
}

interface Itinerary {
  destination: string
  duration_days: number
  pax_summary: string
  itinerary: DayPlan[]
}

export default function ItineraryGenerator() {
  const [destination, setDestination] = useState('')
  const [dates, setDates] = useState('')
  const [travellers, setTravellers] = useState('')
  const [tripStyle, setTripStyle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Itinerary | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, dates, travellers, tripStyle }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Generation failed. Please try again.')
      }

      const data = await res.json()
      setResult(data.itinerary)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Destination <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Paris, France"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Travel Dates or Duration <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="e.g. 10–17 Aug 2025 or 7 nights"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Travellers <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={travellers}
              onChange={(e) => setTravellers(e.target.value)}
              placeholder="e.g. 2 adults, 1 child (age 8)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Trip Style
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={tripStyle}
              onChange={(e) => setTripStyle(e.target.value)}
              placeholder="e.g. Luxury, culture-focused, avoid beaches. Client prefers boutique hotels and local dining."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? 'Generating…' : 'Generate Itinerary'}
          </button>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Generating your itinerary…</p>
          <p className="text-slate-400 text-xs">This usually takes 10–20 seconds</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Itinerary header */}
          <div className="bg-blue-600 rounded-2xl p-6 sm:p-8 text-white">
            <h2 className="text-2xl font-bold">{result.destination}</h2>
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

          {/* Day cards */}
          {result.itinerary.map((day) => (
            <div key={day.day} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Day header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {day.day}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{day.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{day.description}</p>
                </div>
              </div>

              {/* Day meta */}
              {(day.hotel || day.meals_included) && (
                <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                  {day.hotel && (
                    <span>
                      <span className="font-medium text-slate-700">Hotel:</span> {day.hotel}
                    </span>
                  )}
                  {day.meals_included && (
                    <span>
                      <span className="font-medium text-slate-700">Meals:</span> {day.meals_included}
                    </span>
                  )}
                </div>
              )}

              {/* Activities */}
              <ul className="divide-y divide-slate-100">
                {day.activities.map((activity, i) => (
                  <li key={i} className="px-6 py-4 flex items-start gap-4">
                    {/* Verified badge */}
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                          ✅ Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                          ⚠️ Unverified
                        </span>
                      )}
                    </div>

                    {/* Activity details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-slate-800 text-sm">{activity.name}</span>
                        {activity.duration_mins && (
                          <span className="text-xs text-slate-400">{activity.duration_mins} min</span>
                        )}
                        {activity.maps_link && (
                          <a
                            href={activity.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            📍 View on Maps
                          </a>
                        )}
                      </div>
                      {activity.notes && (
                        <p className="text-xs text-slate-500 mt-1">{activity.notes}</p>
                      )}
                      {!activity.verified && activity.verified_note && (
                        <p className="text-xs text-slate-400 mt-1 italic">{activity.verified_note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
