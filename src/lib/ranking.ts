import type { ITicket, Party } from "../types";

import { TICKETS } from "./data";

export function cheapestTicket(zones: number, party: Party): ITicket {
  if (party === "one-adult-two-children") {
    return TICKETS["family-one-adult"];
  }

  if (party === "two-adults-two-children") {
    return TICKETS["family-two-adults"];
  }

  // single — day ticket valid for all zones
  if (zones <= 13) {
    return TICKETS["regional"];
  }

  return TICKETS["whole-network"];
}
