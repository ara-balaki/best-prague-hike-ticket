import type { FormValues, Party, Stop, TransportFilter } from '../types'
import { highestZone } from './zones'

/**
 * The user's intent, resolved from form values + stop catalogue.
 *
 * Everything downstream — ranking, analytics, result display — speaks Trip.
 */
export interface Trip {
  /** Highest outer zone of the destination (1-13). */
  outerZone: number
  party: Party
  hasPraguePass: boolean
  /** Shortest direct one-way journey time from Praha hl.n., in minutes. */
  journeyMinutes?: number
  /** Original stop name (or "Zone N" sentinel for the zone shortcut). */
  stopName: string
  transport: TransportFilter
}

/**
 * Resolve form values + the loaded stop catalogue into a Trip.
 * Returns null when the form doesn't yet describe a complete trip.
 * Pass journeyMinutesOverride to substitute the API-derived duration for the static GTFS value.
 */
export function resolveTrip(
  values: FormValues,
  stops: Stop[],
  journeyMinutesOverride?: number
): Trip | null {
  const {
    to: stopName,
    party = 'single',
    transportFilter: transport = 'all',
    zoneCount,
    hasPraguePass = false,
  } = values

  if (!stopName) return null

  // Zone shortcut: user typed "zone 4" — bypass stop lookup entirely.
  if (zoneCount !== undefined) {
    return {
      outerZone: zoneCount,
      party,
      hasPraguePass,
      stopName,
      transport,
    }
  }

  const stop = stops.find((s) => s.name === stopName)
  if (!stop) return null

  return {
    outerZone: highestZone(stop, transport),
    party,
    hasPraguePass,
    journeyMinutes: journeyMinutesOverride ?? stop.journeyMinutes,
    stopName,
    transport,
  }
}
