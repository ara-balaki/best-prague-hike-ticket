import { PARTY_LABELS } from "../../lib/transport";
import type { ITicket } from "../../types";

interface TicketProps {
  ticket: ITicket;
  routeFrom: string;
  routeTo: string;
  zoneLabel: string;
  partyLabel?: string;
}

function formatPrice(price: number): string {
  return `${Math.round(price)} Kč`;
}

function formatValidity(
  validity: number,
  type: import("../../types").TicketValidityDuration,
): string {
  if (type === "day-cutoff") return "Until 4:00 AM next day";
  if (validity >= 1440) return "24 hours";
  return `${validity} minutes`;
}

interface CardProps {
  name: string;
  price: string;
  validity: string;
  routeFrom: string;
  routeTo: string;
  zoneLabel: string;
  partyDisplay: string;
}

function TicketCard({
  name,
  price,
  validity,
  routeFrom,
  routeTo,
  zoneLabel,
  partyDisplay,
}: CardProps) {
  return (
    <div className="@container relative w-full overflow-hidden rounded-xl bg-ticket aspect-[2.8/1] shadow-sm">
      <Perforation />
      <div
        className="flex h-full flex-col justify-between"
        style={{ padding: "3.2cqi 4cqi 3.2cqi 5.5cqi" }}
      >
        {/* Top: brand + name left, price right */}
        <div className="flex items-start justify-between" style={{ gap: "1cqi" }}>
          <div>
            <p
              className="font-semibold uppercase text-forest leading-none"
              style={{ fontSize: "2cqi", letterSpacing: "0.1em" }}
            >
              Prague Integrated Transport
            </p>
            <h3
              className="font-bold text-forest leading-tight"
              style={{ marginTop: "0.3cqi", fontSize: "3.2cqi" }}
            >
              {name}
            </h3>
          </div>
          <p
            className="shrink-0 font-bold text-forest"
            style={{ fontSize: "4.8cqi" }}
          >
            {price}
          </p>
        </div>

        {/* Dashed divider */}
        <div aria-hidden className="border-t-2 border-dashed border-amber" />

        {/* Bottom: info left, mountains right */}
        <div className="flex items-end justify-between" style={{ gap: "1cqi" }}>
          <div className="flex" style={{ gap: "2cqi" }}>
            <div>
              <p
                className="text-muted leading-none"
                style={{ fontSize: "2cqi" }}
              >
                Route
              </p>
              <p
                className="font-semibold text-black"
                style={{ marginTop: "0.3cqi", fontSize: "2.4cqi" }}
              >
                {routeFrom} → {routeTo}
              </p>
              <p className="text-muted" style={{ fontSize: "2cqi" }}>
                {zoneLabel}
              </p>
            </div>
            <div>
              <p
                className="text-muted leading-none"
                style={{ fontSize: "2cqi" }}
              >
                Hikers
              </p>
              <p
                className="font-medium text-black"
                style={{ marginTop: "0.3cqi", fontSize: "2.4cqi" }}
              >
                {partyDisplay}
              </p>
            </div>
            <div>
              <p
                className="text-muted leading-none"
                style={{ fontSize: "2cqi" }}
              >
                Valid
              </p>
              <p
                className="font-medium text-black"
                style={{ marginTop: "0.3cqi", fontSize: "2.4cqi" }}
              >
                {validity}
              </p>
            </div>
          </div>
          <Mountains />
        </div>
      </div>
    </div>
  );
}

export function Ticket({
  ticket,
  routeFrom,
  routeTo,
  zoneLabel,
  partyLabel,
}: TicketProps) {
  const { name, type, price, validity, party } = ticket;
  const partyDisplay = partyLabel ?? PARTY_LABELS[party] ?? party;

  const cardProps: CardProps = {
    name,
    price: formatPrice(price),
    validity: formatValidity(validity, type),
    routeFrom,
    routeTo,
    zoneLabel,
    partyDisplay,
  };

  return (
    <div className="@container mx-auto w-full sm:max-w-126 -rotate-2">
      <TicketCard {...cardProps} />
    </div>
  );
}

function Perforation() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-2 left-1.5 flex flex-col justify-between"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="block size-1.5 rounded-full bg-amber" />
      ))}
    </div>
  );
}

function Mountains() {
  return (
    <div aria-hidden className="flex shrink-0 items-end gap-0.5 text-sage">
      <svg width="14" height="11" viewBox="0 0 18 14" fill="currentColor">
        <path d="M9 0 L18 14 L0 14 Z" />
      </svg>
      <svg width="18" height="14" viewBox="0 0 22 18" fill="currentColor">
        <path d="M11 0 L22 18 L0 18 Z" />
      </svg>
      <svg width="14" height="11" viewBox="0 0 18 14" fill="currentColor">
        <path d="M9 0 L18 14 L0 14 Z" />
      </svg>
    </div>
  );
}
