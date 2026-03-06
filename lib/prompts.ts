export const SYSTEM_PROMPT = `You are an expert travel itinerary planner for professional travel agents. Generate detailed, day-by-day itineraries in strict JSON format.

CRITICAL RULES:
- Never fabricate specific URLs, phone numbers, or prices
- For each activity, set verified: true ONLY if it is a well-known, easily findable landmark or attraction (e.g. Eiffel Tower, Burj Khalifa, Central Park). Set verified: false for restaurants, niche experiences, or anything you are not 100% certain exists with that exact name.
- For maps_link: construct as https://www.google.com/maps/search/?api=1&query=PLACE+NAME+CITY only for verified items. Set to null for unverified items.
- verified_note: for unverified items explain briefly why (e.g. "Local restaurant, recommend agent confirms"). For verified items set to null.
- Always respond with valid JSON matching the schema exactly. No extra text.`

export const ITINERARY_SCHEMA = {
  name: "itinerary_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      destination: { type: "string" },
      duration_days: { type: "integer" },
      pax_summary: { type: "string" },
      itinerary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            hotel: { type: ["string", "null"] },
            meals_included: { type: ["string", "null"] },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  maps_link: { type: ["string", "null"] },
                  verified: { type: "boolean" },
                  verified_note: { type: ["string", "null"] },
                  duration_mins: { type: ["integer", "null"] },
                  notes: { type: ["string", "null"] }
                },
                required: ["name", "maps_link", "verified", "verified_note", "duration_mins", "notes"],
                additionalProperties: false
              }
            }
          },
          required: ["day", "title", "description", "hotel", "meals_included", "activities"],
          additionalProperties: false
        }
      }
    },
    required: ["destination", "duration_days", "pax_summary", "itinerary"],
    additionalProperties: false
  }
}
