import type { ITicket } from "../types";
import { TICKETS } from "./data";
import type { Trip } from "./trip";

export interface TicketRecommendation {
  ticket: ITicket;
  /** 1 for day tickets, 2 for short-term (one each direction). */
  quantity: 1 | 2;
  /** Total trip cost in Kč (= ticket.price × quantity). */
  tripCost: number;
}

function isTicketValid(ticket: ITicket, trip: Trip): boolean {
  // Group composition must match.
  if (ticket.party !== trip.party) return false;

  // Zone coverage.
  if (!trip.hasPraguePass && !ticket.coversPrague) return false;
  if (trip.outerZone > ticket.maxOuterZone) return false;

  // Short-term tickets: also need a known journey time + total fare zones to fit.
  // Prague counts as 1 zone in PID's fare table; outer zones add 1 each.
  // With a Prague pass, the user only declares the outer zones.
  if (ticket.category === "short-term") {
    const required = (trip.hasPraguePass ? 0 : 1) + trip.outerZone;
    if ((ticket.fareZones ?? 0) < required) return false;
    if (trip.journeyMinutes === undefined) return false;
    if (ticket.validity < trip.journeyMinutes) return false;
  }

  return true;
}

/**
 * Pick the cheapest valid ticket combo for the trip.
 *
 * Compares "1 day ticket" against "2 short-term tickets" (one each way) and
 * returns the cheapest. Falls back to the cheapest day ticket if the journey
 * time is unknown (short-term tickets need it to verify validity).
 */
export function cheapestTicket(trip: Trip): TicketRecommendation {
  let best: TicketRecommendation | null = null;
  for (const ticket of Object.values(TICKETS)) {
    if (!isTicketValid(ticket, trip)) continue;
    const quantity: 1 | 2 = ticket.category === "short-term" ? 2 : 1;
    const tripCost = ticket.price * quantity;
    if (!best || tripCost < best.tripCost) {
      best = { ticket, quantity, tripCost };
    }
  }

  if (best) return best;

  // Defensive fallback: every party must have a whole-network day option.
  // This branch should be unreachable given the data set.
  const fallbackId =
    trip.party === "one-adult-two-children"
      ? "family-one-adult"
      : trip.party === "two-adults-two-children"
        ? "family-two-adults"
        : "whole-network";
  const fallback = TICKETS[fallbackId];
  return { ticket: fallback, quantity: 1, tripCost: fallback.price };
}
