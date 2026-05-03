export type Transport =
  | "bus"
  | "train"
  | "tram"
  | "metro"
  | "ferry"
  | "trolleybus";

export interface IStop {
  name: string;
  searchKey: string;
  zones: Partial<Record<Transport, string[]>>;
  /** Shortest direct-trip time from the journey hub (Praha hl.n.). */
  journeyMinutes?: number;
  /** WGS-84 latitude, averaged across all platforms with this name. */
  lat?: number;
  /** WGS-84 longitude, averaged across all platforms with this name. */
  lon?: number;
}

export interface IStopsData {
  _meta: {
    source: string;
    license: string;
    attribution: string;
    generatedAt: string;
    stopCount: number;
    journeyHubs?: string[];
    journeyComputedAt?: string;
  };
  stops: IStop[];
}

export type Party =
  | "single"
  | "one-adult-two-children"
  | "two-adults-two-children";

/**
 * - `day`: 24h rolling validity from validation
 * - `day-cutoff`: valid until 4:00 AM the following day (family group tickets)
 * - `minutes`: short-term ticket validated for N minutes from tap-on
 */
export type TicketValidityDuration = "day" | "day-cutoff" | "minutes";

export type TicketCategory = "short-term" | "day";

type ShortTermZones = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
export type ShortTermTicketID = `single-z${ShortTermZones}`;
export type DayTicketID =
  | "regional"
  | "prague-and-1-4"
  | "whole-network"
  | "family-one-adult"
  | "family-two-adults";
export type TicketID = ShortTermTicketID | DayTicketID;

export interface ITicket {
  id: TicketID;
  party: Party;
  category: TicketCategory;
  type: TicketValidityDuration;
  /** Validity in minutes (1440 for day tickets). */
  validity: number;
  /** Price per ticket, in CZK. For short-term tickets, round-trip cost is 2× this. */
  price: number;
  /** Does the ticket cover the Prague tariff zones (P, 0, B)? */
  coversPrague: boolean;
  /**
   * Highest outer zone (1-13) the ticket reaches. Use 13 for "Whole Network"
   * since PID's outer zones cap at 13.
   */
  maxOuterZone: number;
  /**
   * For short-term tickets only: total fare zones the ticket buys.
   * (Prague counts as 1 zone in this count; outer zones add 1 each.)
   */
  fareZones?: number;
}

export type TransportFilter = Transport | "all";

export type FormValues = {
  transport?: TransportFilter;
  stop: string;
  zoneCount?: number;
  party?: Party;
  hasPraguePass?: boolean;
};
