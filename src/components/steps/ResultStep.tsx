import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { formatValidity } from "../../lib/formaters";
import { cheapestTicket } from "../../lib/ranking";
import { getZoneInfo, PARTY_LABELS } from "../../lib/transport";
import type { FormValues, IStop } from "../../types";
import { Ticket } from "../ui/Ticket";

interface ResultStepProps {
  stops: IStop[];
}

export function ResultStep({ stops }: ResultStepProps) {
  const { control } = useFormContext<FormValues>();
  const stopName = useWatch({ control, name: "stop" });
  const transport = useWatch({ control, name: "transport" });
  const party = useWatch({ control, name: "party" }) ?? "single";

  const stop = useMemo(
    () => stops.find((s) => s.name === stopName),
    [stops, stopName],
  );

  if (!stop) {
    return (
      <p className="text-center text-sm text-muted">
        No matching stop found. Please go back and pick a destination.
      </p>
    );
  }

  const { count, label } = getZoneInfo(stop, transport ?? "all");
  const ticket = cheapestTicket(count, party);
  const partyLabel = PARTY_LABELS[party];
  const isCutoff = ticket.type === "day-cutoff";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
      {/* Summary — shown where description would be */}
      <p className="text-center text-base leading-relaxed text-muted text-balance">
        Your best option is the{" "}
        <strong className="text-forest">{ticket.name}</strong> valid for{" "}
        {formatValidity(ticket.validity, ticket.type)} at{" "}
        <strong className="text-forest">{ticket.price} Kč</strong>.
      </p>

      {isCutoff && (
        <div className="w-full flex items-start gap-2 rounded-xl border border-amber/60 bg-amber/10 px-4 py-3 text-sm text-forest">
          <span aria-hidden>⏰</span>
          <p>
            Valid <strong>until 4:00 AM the following day</strong>, not a full
            24 hours.
          </p>
        </div>
      )}

      <div className="w-full">
        <Ticket
          ticket={ticket}
          routeFrom="Prague"
          routeTo={stop.name}
          zoneLabel={label}
          partyLabel={partyLabel}
        />
      </div>
    </div>
  );
}
