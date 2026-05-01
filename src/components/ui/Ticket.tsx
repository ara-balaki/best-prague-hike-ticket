import { useTranslation } from "react-i18next";

import { formatPrice } from "../../lib/formaters";
import type { ITicket } from "../../types";

interface TicketProps {
  ticket: ITicket;
  routeFrom: string;
  routeTo: string;
  zoneLabel: string;
  partyLabel?: string;
}

interface CardProps {
  name: string;
  price: string;
  validity: string;
  routeFrom: string;
  routeTo: string;
  zoneLabel: string;
  partyDisplay: string;
  labels: { valid: string; route: string; hikers: string; brand: string };
}

function TicketCard({
  name,
  price,
  validity,
  routeFrom,
  routeTo,
  zoneLabel,
  partyDisplay,
  labels,
}: CardProps) {
  return (
    <div className="@container relative w-full overflow-hidden rounded-xl bg-ticket aspect-[2.8/1] shadow-sm">
      <Perforation />
      <div
        className="flex h-full flex-col justify-between"
        style={{ padding: "3.2cqi 4cqi 3.2cqi 5.5cqi" }}
      >
        {/* Top: brand + name left, price right */}
        <div
          className="flex items-start justify-between"
          style={{ gap: "1cqi" }}
        >
          <div>
            <p
              className="font-semibold uppercase text-forest leading-none"
              style={{ fontSize: "2cqi", letterSpacing: "0.1em" }}
            >
              {labels.brand}
            </p>
            <h3
              className="font-bold text-forest leading-tight"
              style={{ marginTop: "0.3cqi", fontSize: "3.2cqi" }}
            >
              {name}
            </h3>
            <div className="mt-2">
              <p
                className="text-muted leading-none"
                style={{ fontSize: "2cqi" }}
              >
                {labels.valid}
              </p>
              <p
                className="font-medium text-black"
                style={{ marginTop: "0.3cqi", fontSize: "2.4cqi" }}
              >
                {validity}
              </p>
            </div>
          </div>
          <p
            className="shrink-0 font-bold text-forest"
            style={{ fontSize: "5.4cqi" }}
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
                {labels.route}
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
                {labels.hikers}
              </p>
              <p
                className="font-medium text-black"
                style={{ marginTop: "0.3cqi", fontSize: "2.4cqi" }}
              >
                {partyDisplay}
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
  const { t } = useTranslation();

  const ticketNameKey: Record<string, string> = {
    regional: "ticket.regional",
    "whole-network": "ticket.wholeNetwork",
    "family-one-adult": "ticket.familyOneAdult",
    "family-two-adults": "ticket.familyTwoAdults",
  };

  const partyLabelKey: Record<string, string> = {
    single: "partyLabels.single",
    "one-adult-two-children": "partyLabels.oneAdultTwoChildren",
    "two-adults-two-children": "partyLabels.twoAdultsFourChildren",
  };

  const name = t(ticketNameKey[ticket.id]);
  const validity = t(`validity.${ticket.type === "day-cutoff" ? "cutoff" : "day"}`);
  const partyDisplay = partyLabel ?? t(partyLabelKey[ticket.party]);

  const labels = {
    brand: t("ticket.brand"),
    valid: t("ticket.validLabel"),
    route: t("ticket.routeLabel"),
    hikers: t("ticket.hikersLabel"),
  };

  return (
    <div className="@container mx-auto w-full sm:max-w-126 -rotate-2">
      <TicketCard
        name={name}
        price={formatPrice(ticket.price)}
        validity={validity}
        routeFrom={routeFrom}
        routeTo={routeTo}
        zoneLabel={zoneLabel}
        partyDisplay={partyDisplay}
        labels={labels}
      />
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
