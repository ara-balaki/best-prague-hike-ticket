import { useFormContext, useWatch } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { cheapestTicket } from "../../lib/ranking";
import {
  partyLabel as partyDisplayLabel,
  ticketName,
  ticketValidity,
} from "../../lib/ticketDisplay";
import { resolveTrip } from "../../lib/trip";
import type { FormValues, IStop } from "../../types";
import { Ticket } from "../ui/Ticket";

interface ResultStepProps {
  stops: IStop[];
}

export function ResultStep({ stops }: ResultStepProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<FormValues>();
  // Watch the whole form so the recommendation rerenders on any change.
  const values = useWatch({ control });

  const trip = resolveTrip(values as FormValues, stops);
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
              ticketName,
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
