import { describe, expect, it } from 'vitest'

import type { Party } from '../types'
import { TICKETS } from './data'
import { cheapestTicket } from './ranking'
import type { Trip } from './trip'

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    outerZone: 1,
    party: 'single' as Party,
    hasPraguePass: false,
    stopName: 'test',
    transport: 'all',
    ...overrides,
  }
}

describe('cheapestTicket', () => {
  describe('single traveller, no journey time (day-only fallback)', () => {
    it('zones ≤ 4 without Prague pass → Prague + 1-4 (192)', () => {
      const r = cheapestTicket(trip({ outerZone: 1 }))
      expect(r.ticket.id).toBe('prague-and-1-4')
      expect(r.quantity).toBe(1)
      expect(r.tripCost).toBe(192)
    })

    it('zones > 4 without Prague pass → whole-network (288)', () => {
      const r = cheapestTicket(trip({ outerZone: 5 }))
      expect(r.ticket.id).toBe('whole-network')
      expect(r.tripCost).toBe(288)
    })

    it('zones ≤ 13 with Prague pass → Regional (168)', () => {
      const r = cheapestTicket(trip({ outerZone: 13, hasPraguePass: true }))
      expect(r.ticket.id).toBe('regional')
      expect(r.tripCost).toBe(168)
    })
  })

  describe('single traveller with journey time → short-term wins for short trips', () => {
    it('Roztoky-like: zone 1, 18 min, no pass → 2× 3-zone short (72 < 192)', () => {
      const r = cheapestTicket(trip({ outerZone: 1, journeyMinutes: 18 }))
      expect(r.ticket.id).toBe('single-z3')
      expect(r.quantity).toBe(2)
      expect(r.tripCost).toBe(72)
    })

    it('very short trip: zone 1, 12 min, no pass → 2× 2-zone short (48 < 192)', () => {
      const r = cheapestTicket(trip({ outerZone: 1, journeyMinutes: 12 }))
      expect(r.ticket.id).toBe('single-z2')
      expect(r.tripCost).toBe(48)
    })

    it('Karlštejn-like: zone 4, 32 min, no pass → 2× 5-zone short (120 < 192)', () => {
      const r = cheapestTicket(trip({ outerZone: 4, journeyMinutes: 32 }))
      expect(r.ticket.id).toBe('single-z5')
      expect(r.tripCost).toBe(120)
    })

    it('Beroun-like: zone 5, 43 min, no pass → 2× 6-zone short (144 < 288)', () => {
      const r = cheapestTicket(trip({ outerZone: 5, journeyMinutes: 43 }))
      expect(r.ticket.id).toBe('single-z6')
      expect(r.tripCost).toBe(144)
    })

    it('very long zone 13 trip → day ticket beats short-term', () => {
      const r = cheapestTicket(trip({ outerZone: 13, journeyMinutes: 90 }))
      expect(r.ticket.id).toBe('whole-network')
      expect(r.tripCost).toBe(288)
    })

    it('with Prague pass, zones 1, 18 min → 2× 3-zone short (72 < 168)', () => {
      const r = cheapestTicket(
        trip({ outerZone: 1, hasPraguePass: true, journeyMinutes: 18 })
      )
      expect(r.ticket.id).toBe('single-z3')
      expect(r.tripCost).toBe(72)
    })

    it('journey > 180 min → day ticket only (no short-term has enough validity)', () => {
      const r = cheapestTicket(trip({ outerZone: 2, journeyMinutes: 200 }))
      expect(r.ticket.category).toBe('day')
    })
  })

  describe('group tickets — family always wins regardless of journey time', () => {
    it('1 adult + 2 children → family ticket', () => {
      const r = cheapestTicket(
        trip({
          outerZone: 4,
          party: 'one-adult-two-children',
          journeyMinutes: 30,
        })
      )
      expect(r.ticket.id).toBe('family-one-adult')
      expect(r.tripCost).toBe(190)
    })

    it('2 adults + 4 children → family ticket', () => {
      const r = cheapestTicket(
        trip({
          outerZone: 4,
          party: 'two-adults-two-children',
          journeyMinutes: 30,
        })
      )
      expect(r.ticket.id).toBe('family-two-adults')
      expect(r.tripCost).toBe(370)
    })
  })

  describe('ticket pool sanity', () => {
    it('includes 15 short-term tickets (zones 2-16)', () => {
      const shortTerms = Object.values(TICKETS).filter(
        (t) => t.category === 'short-term'
      )
      expect(shortTerms).toHaveLength(15)
    })
  })
})
