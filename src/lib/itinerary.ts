const ITINERARY_API = 'https://api.levijo.cz/api/itinerary-duration'

interface Location {
  name: string
  lat: number
  lon: number
}

export async function fetchJourneyMinutes(
  from: Location,
  to: Location
): Promise<number | null> {
  try {
    const res = await fetch(ITINERARY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { name: from.name, lat: from.lat, lon: from.lon },
        to: { name: to.name, lat: to.lat, lon: to.lon },
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const seconds = parseInt(data.durationSeconds, 10)
    if (isNaN(seconds) || seconds <= 0) return null
    return Math.ceil(seconds / 60)
  } catch {
    return null
  }
}
