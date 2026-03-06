'use client'

import { useState, useEffect } from 'react'
import CountrySelector from '../../components/CountrySelector'
import CitySelector from '../../components/CitySelector'
import TravelDates, { TravelDatesValue } from '../../components/TravelDates'
import TravelerDetails from '../../components/TravelerDetails'
import PaxSelector from '../../components/PaxSelector'
import BudgetSelector from '../../components/BudgetSelector'
import GeneratingScreen from '../../components/GeneratingScreen'

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
  const [selectedCountries, setSelectedCountries] = useState<{code:string;name:string;emoji:string}[]>([])
  const [selectedCities, setSelectedCities] = useState<{name:string;countryCode:string}[]>([])
  const [travelDates, setTravelDates] = useState<TravelDatesValue>({ startDate: null, endDate: null, arrivalTime: '', departureTime: '', nights: null })
  const [travelerDetails, setTravelerDetails] = useState<{ travelerTypes: string[]; otherTraveler: string; occasion: string }>({ travelerTypes: [], otherTraveler: '', occasion: '' })
  const [pax, setPax] = useState({ adults: 2, children: 0, infants: 0 })
  const [budget, setBudget] = useState('comfort')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Itinerary | null>(null)

  useEffect(() => {
    const codes = new Set(selectedCountries.map(c => c.code))
    setSelectedCities(prev => prev.filter(c => codes.has(c.countryCode)))
  }, [selectedCountries])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
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
          pax: pax.adults + ' adults, ' + pax.children + ' children, ' + pax.infants + ' infants',
          travelerTypes: travelerDetails.travelerTypes.join(', '),
          occasion: travelerDetails.occasion,
          budget,
        }),
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
        <GeneratingScreen
          selectedCountries={selectedCountries}
          budget={budget}
          occasion={travelerDetails.occasion}
          travelerTypes={travelerDetails.travelerTypes}
        />
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
