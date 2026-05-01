import { usePostHog } from "@posthog/react";
import { useMemo } from "react";

import type { Party } from "../types";
import type { TicketRecommendation } from "./ranking";
import type { Trip } from "./trip";

type PostHog = ReturnType<typeof usePostHog>;

function tripProps(trip: Trip, rec: TicketRecommendation) {
  return {
    stop_name: trip.stopName,
    zone_count: trip.outerZone,
    journey_minutes: trip.journeyMinutes,
    party: trip.party,
    transport_filter: trip.transport,
    has_prague_pass: trip.hasPraguePass,
    ticket_id: rec.ticket.id,
    ticket_quantity: rec.quantity,
    trip_cost: rec.tripCost,
  };
}

/**
 * Strongly-typed wrapper around PostHog. One function per event; each owns
 * its property shape so call sites pass domain objects, not property bags.
 */
export interface Analytics {
  ticketFound(trip: Trip, rec: TicketRecommendation): void;
  purchaseClicked(trip: Trip, rec: TicketRecommendation): void;
  newSearchStarted(prev: Pick<Trip, "stopName" | "party" | "transport">): void;
  stopSelected(stopName: string, transport: string): void;
  zoneSelected(zone: number): void;
  partySelected(party: Party): void;
  praguePassToggled(hasPraguePass: boolean): void;
  languageChanged(language: string): void;
}

export function createAnalytics(posthog: PostHog): Analytics {
  return {
    ticketFound: (trip, rec) =>
      posthog?.capture("ticket_found", tripProps(trip, rec)),
    purchaseClicked: (trip, rec) =>
      posthog?.capture("purchase_link_clicked", tripProps(trip, rec)),
    newSearchStarted: (prev) =>
      posthog?.capture("new_search_started", {
        previous_stop: prev.stopName,
        previous_party: prev.party,
        previous_transport_filter: prev.transport,
      }),
    stopSelected: (stopName, transport) =>
      posthog?.capture("stop_selected", {
        stop_name: stopName,
        transport_filter: transport,
      }),
    zoneSelected: (zone) => posthog?.capture("zone_selected", { zone }),
    partySelected: (party) => posthog?.capture("party_selected", { party }),
    praguePassToggled: (hasPraguePass) =>
      posthog?.capture("prague_pass_toggled", { has_prague_pass: hasPraguePass }),
    languageChanged: (language) =>
      posthog?.capture("language_changed", { language }),
  };
}

export function useAnalytics(): Analytics {
  const posthog = usePostHog();
  return useMemo(() => createAnalytics(posthog), [posthog]);
}
