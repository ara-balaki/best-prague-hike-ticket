import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { fetchJourneyMinutes } from "../../lib/itinerary";
import { cheapestTicket } from "../../lib/ranking";
import {
  partyLabel as partyDisplayLabel,
  ticketName,
  ticketValidity,
} from "../../lib/ticketDisplay";
import { resolveTrip } from "../../lib/trip";
import type { FormValues, IStop } from "../../types";
import { Ticket } from "../ui/Ticket";

const JOURNEY_HUB = "Praha hl.n.";

interface ResultStepProps {
  stops: IStop[];
}

export function ResultStep({ stops }: ResultStepProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<FormValues>();
  const values = useWatch({ control });

  // undefined = fetching, null = no result (fallback to static), number = API result
  const [apiJourneyMinutes, setApiJourneyMinutes] = useState<
    number | null | undefined
  >(undefined);

  const stopName = values.stop;
  const zoneCount = values.zoneCount;

  const dest = stopName ? stops.find((s) => s.name === stopName) : undefined;
  const hub = stops.find((s) => s.name === JOURNEY_HUB);
  const shouldFetch =
    zoneCount === undefined &&
    !!stopName &&
    !!(dest?.lat && dest?.lon && hub?.lat && hub?.lon);

  useEffect(() => {
    if (!shouldFetch) return;

    const dest = stops.find((s) => s.name === stopName);
    const hub = stops.find((s) => s.name === JOURNEY_HUB);
    if (!dest?.lat || !dest?.lon || !hub?.lat || !hub?.lon) return;

    let cancelled = false;

    fetchJourneyMinutes(
      { name: hub.name, lat: hub.lat, lon: hub.lon },
      { name: dest.name, lat: dest.lat, lon: dest.lon },
    ).then((minutes) => {
      if (!cancelled) setApiJourneyMinutes(minutes);
    });

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, stopName, stops]);

  if (shouldFetch && apiJourneyMinutes === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />
      </div>
    );
  }

  const trip = resolveTrip(
    values as FormValues,
    stops,
    apiJourneyMinutes ?? undefined,
  );

  if (!trip) {
    return (
      <p className="text-center text-sm text-muted">{t("result.noStop")}</p>
    );
  }

  const { ticket, quantity, tripCost } = cheapestTicket(trip);
  const isCutoff = ticket.type === "day-cutoff";
  const isShortTerm = ticket.category === "short-term";
  const label = `Zone ${trip.outerZone}`;
  const routeTo = trip.stopName;

  const ticketLabel = ticketName(ticket, t);
  const validity = ticketValidity(ticket, t);
  const party = partyDisplayLabel(trip.party, t);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
      <p className="text-center text-base leading-relaxed text-muted text-balance">
        {isShortTerm ? (
          <Trans
            i18nKey="result.summaryShortTerm"
            values={{
              ticketName: ticketLabel,
              validity,
              perTicket: ticket.price,
              quantity,
              total: tripCost,
            }}
            components={{ strong: <strong className="text-forest" /> }}
          />
        ) : (
          <Trans
            i18nKey="result.summary"
            values={{ ticketName: ticketLabel, validity, price: tripCost }}
            components={{ strong: <strong className="text-forest" /> }}
          />
        )}
      </p>

      {trip.journeyMinutes !== undefined && (
        <p className="text-center text-sm text-muted">
          {t("result.journeyEstimate", { minutes: trip.journeyMinutes })}
        </p>
      )}

      {isCutoff && (
        <div className="w-full flex items-start gap-2 rounded-xl border border-amber/60 bg-amber/10 px-4 py-3 text-sm text-forest">
          <span aria-hidden>⏰</span>
          <p>
            <Trans
              i18nKey="result.cutoffWarning"
              components={{ strong: <strong /> }}
            />
          </p>
        </div>
      )}

      <div className="w-full">
        <Ticket
          ticket={ticket}
          routeFrom="Prague"
          routeTo={routeTo}
          zoneLabel={label}
          partyLabel={party}
        />
      </div>
    </div>
  );
}
