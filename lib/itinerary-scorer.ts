import type { ScoredItinerary, ScoredDay } from './types'

function clamp(val: number, min = 1, max = 10) {
  return Math.min(max, Math.max(min, val))
}

interface ScoringContext {
  hasInfants: boolean
  hasSeniors: boolean
  occasion: string
}

function calculateFatigue(day: any, context: ScoringContext): number {
  const activityCount = day.schedule?.length ?? 0
  const totalMins = day.schedule?.reduce((sum: number, s: any) => sum + (s.duration_mins ?? 60), 0) ?? 0
  const privateTransfers = day.schedule?.filter((s: any) => s.ticketing_and_logistics?.toLowerCase().includes('private driver') || s.ticketing_and_logistics?.toLowerCase().includes('private transfer')).length ?? 0
  const publicTransfers = day.schedule?.filter((s: any) => s.ticketing_and_logistics?.toLowerCase().includes('subway') || s.ticketing_and_logistics?.toLowerCase().includes('bus') || s.ticketing_and_logistics?.toLowerCase().includes('train')).length ?? 0
  const isIntercityDay = day.schedule?.some((s: any) => s.activity_title?.toLowerCase().includes('transfer') || s.activity_title?.toLowerCase().includes('train') || s.activity_title?.toLowerCase().includes('flight')) ?? false

  let score = 0
  score += activityCount * 1.5
  score += (totalMins / 60) * 0.5
  score += publicTransfers * 0.3
  score -= privateTransfers * 0.2
  score += context.hasInfants ? 2 : 0
  score += context.hasSeniors ? 1.5 : 0
  score += isIntercityDay ? 2 : 0

  return clamp(Math.round(score))
}

function calculateCultural(day: any): number {
  const culturalKeywords = ['temple', 'museum', 'shrine', 'heritage', 'history', 'palace', 'monument', 'gallery', 'traditional', 'cultural', 'ancient', 'ruins', 'festival', 'local market', 'old town']
  const text = JSON.stringify(day).toLowerCase()
  const hits = culturalKeywords.filter(k => text.includes(k)).length
  return clamp(Math.round(hits * 1.8))
}

function calculateAdventure(day: any): number {
  const adventureKeywords = ['hiking', 'trek', 'diving', 'snorkel', 'zip-line', 'safari', 'rafting', 'climbing', 'cycling', 'kayak', 'surf', 'bungee', 'paraglid', 'adventure', 'jungle', 'waterfall']
  const text = JSON.stringify(day).toLowerCase()
  const hits = adventureKeywords.filter(k => text.includes(k)).length
  return clamp(Math.round(hits * 2.5))
}

function calculateOccasionConformity(day: any, occasion: string): number {
  if (!occasion) return 5
  const text = JSON.stringify(day).toLowerCase()
  const occasionKeywords: Record<string, string[]> = {
    'honeymoon': ['romantic', 'sunset', 'private', 'couples', 'candle', 'champagne', 'spa', 'intimate'],
    'anniversary': ['romantic', 'sunset', 'private', 'couples', 'candle', 'champagne', 'spa', 'intimate'],
    'adventure': ['hiking', 'trek', 'diving', 'zip-line', 'safari', 'rafting', 'adventure'],
    'wellness/relaxation': ['spa', 'yoga', 'meditation', 'wellness', 'relax', 'retreat', 'thermal'],
    'religious/pilgrimage': ['temple', 'shrine', 'prayer', 'pilgrimage', 'sacred', 'monastery', 'worship'],
    'birthday': ['celebration', 'special', 'dinner', 'cake', 'surprise', 'festive'],
    'babymoon': ['gentle', 'spa', 'relax', 'comfortable', 'slow', 'scenic'],
    'business/corporate': ['conference', 'meeting', 'networking', 'hotel', 'efficient'],
    'leisure/holiday': ['sightseeing', 'beach', 'explore', 'local', 'food', 'shopping']
  }
  const keywords = occasionKeywords[occasion.toLowerCase()] ?? []
  const hits = keywords.filter(k => text.includes(k)).length
  return clamp(Math.round(2 + hits * 1.5))
}

export function scoreItinerary(rawItinerary: any, context: ScoringContext): ScoredItinerary {
  const scoredDays: ScoredDay[] = rawItinerary.itinerary.map((day: any) => {
    const aiMetrics = day.day_metrics ?? {}
    const fatigue = calculateFatigue(day, context)
    const cultural = calculateCultural(day)
    const adventure = calculateAdventure(day)
    const occasionConformity = calculateOccasionConformity(day, context.occasion)

    return {
      ...day,
      day_metrics: {
        fatigue_level: fatigue,
        cultural_score: cultural,
        adventure_score: adventure,
        occasion_conformity: occasionConformity,
        ai_fatigue: aiMetrics.fatigue_level ?? null,
        ai_cultural: aiMetrics.cultural_score ?? null,
      }
    }
  })

  const allScheduleBlocks = scoredDays.flatMap((d: any) => d.schedule ?? [])
  const totalActivities = allScheduleBlocks.length
  const verifiedActivities = allScheduleBlocks.filter((s: any) => s.verified === true).length
  const trustScore = totalActivities > 0 ? Math.round((verifiedActivities / totalActivities) * 100) : 0
  const avgFatigue = scoredDays.length > 0
    ? Math.round(scoredDays.reduce((sum: number, d: any) => sum + d.day_metrics.fatigue_level, 0) / scoredDays.length)
    : 0

  return {
    ...rawItinerary,
    itinerary: scoredDays,
    overall_metrics: {
      trust_score: trustScore,
      avg_fatigue: avgFatigue,
      total_activities: totalActivities,
      verified_count: verifiedActivities,
      unverified_count: totalActivities - verifiedActivities
    }
  }
}
