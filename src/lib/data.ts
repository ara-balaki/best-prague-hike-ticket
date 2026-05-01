import type { ITicket, TicketID } from "../types";

export const TICKETS: Record<TicketID, ITicket> = {
  regional: {
    id: "regional",
    name: "Regional Ticket 1-13 zones",
    party: "single",
    type: "day",
    validity: 1440,
    price: 168,
  },
  "whole-network": {
    id: "whole-network",
    name: "Whole Network Ticket",
    party: "single",
    type: "day",
    validity: 1440,
    price: 288,
  },
  "family-one-adult": {
    id: "family-one-adult",
    name: "1 Adult + max. 2 Children Ticket",
    party: "one-adult-two-children",
    type: "day-cutoff",
    validity: 1440,
    price: 190,
  },
  "family-two-adults": {
    id: "family-two-adults",
    name: "2 Adults + max. 2 Children Ticket",
    party: "two-adults-two-children",
    type: "day-cutoff",
    validity: 1440,
    price: 370,
  },
};
