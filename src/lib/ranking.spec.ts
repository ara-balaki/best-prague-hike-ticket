import { describe, expect, it } from "vitest";

import { TICKETS } from "./data";
import { cheapestTicket } from "./ranking";

describe("cheapestTicket", () => {
  it("returns regional day ticket for single traveller within 13 zones", () => {
    expect(cheapestTicket(2, "single")).toBe(TICKETS["regional"]);
    expect(cheapestTicket(13, "single")).toBe(TICKETS["regional"]);
  });

  it("returns whole-network ticket for single traveller beyond 13 zones", () => {
    expect(cheapestTicket(14, "single")).toBe(TICKETS["whole-network"]);
    expect(cheapestTicket(16, "single")).toBe(TICKETS["whole-network"]);
  });

  it("returns family ticket for 1 adult + 2 children regardless of zones", () => {
    expect(cheapestTicket(4, "one-adult-two-children")).toBe(
      TICKETS["family-one-adult"],
    );
  });

  it("returns family ticket for 2 adults + 4 children regardless of zones", () => {
    expect(cheapestTicket(4, "two-adults-two-children")).toBe(
      TICKETS["family-two-adults"],
    );
  });
});
