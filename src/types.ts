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
}

export interface IStopsData {
  _meta: {
    source: string;
    license: string;
    attribution: string;
    generatedAt: string;
    stopCount: number;
  };
  stops: IStop[];
}

export type Party =
  | "single"
  | "one-adult-two-children"
  | "two-adults-two-children";

/** "day-cutoff" = valid until 4:00 AM the following day (not a rolling 24 h) */
export type TicketValidityDuration = "day" | "day-cutoff";

export const TicketID = {
  regional: "regional",
  wholeNetwork: "whole-network",
  familyOneAdult: "family-one-adult",
  familyTwoAdults: "family-two-adults",
} as const;

export type TicketID = (typeof TicketID)[keyof typeof TicketID];

export interface ITicket {
  id: TicketID;
  name: string;
  party: Party;
  type: TicketValidityDuration;
  price: number;
  validity: number;
}

export type TransportFilter = Transport | "all";

export type FormValues = {
  transport?: TransportFilter;
  stop: string;
  zoneCount?: number;
  party?: Party;
};
