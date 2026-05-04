import type { ITicket, ShortTermTicketID, TicketID } from '../types'

// PID 2026 short-term single-traveller tickets (zones 2 through 16).
// Validity is fixed by zone count and caps at 180 min; price is 12 Kč × zones.
// Source: https://pid.cz/en/fares/
const SHORT_TERM_SPEC: [zones: number, validityMin: number, priceKc: number][] =
  [
    [2, 15, 24],
    [3, 30, 36],
    [4, 60, 48],
    [5, 90, 60],
    [6, 120, 72],
    [7, 150, 84],
    [8, 180, 96],
    [9, 180, 108],
    [10, 180, 120],
    [11, 180, 132],
    [12, 180, 144],
    [13, 180, 156],
    [14, 180, 168],
    [15, 180, 180],
    [16, 180, 192],
  ]

function makeShortTerm(
  zones: number,
  validity: number,
  price: number
): ITicket {
  return {
    id: `single-z${zones}` as ShortTermTicketID,
    party: 'single',
    category: 'short-term',
    type: 'minutes',
    validity,
    price,
    coversPrague: true,
    // The ticket covers `zones` total fare zones, of which one is Prague.
    // So it reaches outer zones up to (zones - 1).
    maxOuterZone: zones - 1,
    fareZones: zones,
  }
}

const shortTermEntries = Object.fromEntries(
  SHORT_TERM_SPEC.map(([z, v, p]) => [`single-z${z}`, makeShortTerm(z, v, p)])
) as Record<ShortTermTicketID, ITicket>

export const TICKETS: Record<TicketID, ITicket> = {
  ...shortTermEntries,

  // Day tickets — single traveller
  regional: {
    id: 'regional',
    party: 'single',
    category: 'day',
    type: 'day',
    validity: 1440,
    price: 168,
    coversPrague: false, // outer zones 1-13 only
    maxOuterZone: 13,
  },
  'prague-and-1-4': {
    id: 'prague-and-1-4',
    party: 'single',
    category: 'day',
    type: 'day',
    validity: 1440,
    price: 192,
    coversPrague: true,
    maxOuterZone: 4,
  },
  'whole-network': {
    id: 'whole-network',
    party: 'single',
    category: 'day',
    type: 'day',
    validity: 1440,
    price: 288,
    coversPrague: true,
    maxOuterZone: 13,
  },

  // Family / group day tickets — whole network, valid until 4:00 AM next day
  'family-one-adult': {
    id: 'family-one-adult',
    party: 'one-adult-two-children',
    category: 'day',
    type: 'day-cutoff',
    validity: 1440,
    price: 190,
    coversPrague: true,
    maxOuterZone: 13,
  },
  'family-two-adults': {
    id: 'family-two-adults',
    party: 'two-adults-two-children',
    category: 'day',
    type: 'day-cutoff',
    validity: 1440,
    price: 370,
    coversPrague: true,
    maxOuterZone: 13,
  },
}
