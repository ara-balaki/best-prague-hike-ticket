import type { ITicket, TicketID } from "../types";

export const TICKETS: Record<TicketID, ITicket> = {
  regional: {
    id: "regional",
    name: "Regional Day Ticket",
    party: "single",
    type: "day",
    validity: 1440,
    price: 168,
  },
  "whole-network": {
    id: "whole-network",
    name: "Whole Network Day Ticket",
    party: "single",
    type: "day",
    validity: 1440,
    price: 288,
  },
  "family-one-adult": {
    id: "family-one-adult",
    name: "Family Day Ticket",
    party: "one-adult-two-children",
    type: "day-cutoff",
    validity: 1440,
    price: 190,
  },
  "family-two-adults": {
    id: "family-two-adults",
    name: "Family Day Ticket",
    party: "two-adults-two-children",
    type: "day-cutoff",
    validity: 1440,
    price: 370,
  },
};
