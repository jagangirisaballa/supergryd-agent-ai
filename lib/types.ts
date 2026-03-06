export interface ScheduleBlock {
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

export interface DayMetrics {
  fatigue_level: number
  cultural_score: number
  adventure_score: number
  occasion_conformity: number
  ai_fatigue?: number | null
  ai_cultural?: number | null
}

export interface ScoredDay {
  day: number
  title: string
  hotel: string | null
  meals_included: string | null
  flight_disclaimer: string | null
  day_metrics: DayMetrics
  schedule: ScheduleBlock[]
}

export interface OverallMetrics {
  trust_score: number
  avg_fatigue: number
  total_activities: number
  verified_count: number
  unverified_count: number
}

export interface ScoredItinerary {
  destination: string
  duration_days: number
  pax_summary: string
  itinerary: ScoredDay[]
  overall_metrics: OverallMetrics
}
