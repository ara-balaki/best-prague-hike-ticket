import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { cheapestTicket } from "../../lib/ranking";
import { getZoneInfo, PARTY_LABELS } from "../../lib/transport";
import type { FormValues, IStop } from "../../types";
import { Ticket } from "../ui/Ticket";

interface ResultStepProps {
  stops: IStop[];
}

const PARTY_LABEL_KEYS: Record<keyof typeof PARTY_LABELS, string> = {
  single: "partyLabels.single",
  "one-adult-two-children": "partyLabels.oneAdultTwoChildren",
  "two-adults-two-children": "partyLabels.twoAdultsFourChildren",
};

export function ResultStep({ stops }: ResultStepProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<FormValues>();
  const stopName = useWatch({ control, name: "stop" });
  const transport = useWatch({ control, name: "transport" });
  const party = useWatch({ control, name: "party" }) ?? "single";
  const zoneCount = useWatch({ control, name: "zoneCount" });

  const stop = useMemo(
    () => (zoneCount ? null : stops.find((s) => s.name === stopName)),
    [stops, stopName, zoneCount],
  );

  if (!zoneCount && !stop) {
    return (
      <p className="text-center text-sm text-muted">{t("result.noStop")}</p>
    );
  }

  const count = zoneCount ?? getZoneInfo(stop!, transport ?? "all").count;
  const label = `Zone ${count}`;
  const routeTo = zoneCount ? `Zone ${zoneCount}` : stop!.name;
  const ticket = cheapestTicket(count, party);
  const partyLabel = t(PARTY_LABEL_KEYS[party]);
  const isCutoff = ticket.type === "day-cutoff";
  const validity = t(`validity.${isCutoff ? "cutoff" : "day"}`);

  const ticketNameKey: Record<string, string> = {
    regional: "ticket.regional",
    "whole-network": "ticket.wholeNetwork",
    "family-one-adult": "ticket.familyOneAdult",
    "family-two-adults": "ticket.familyTwoAdults",
  };
  const ticketName = t(ticketNameKey[ticket.id]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
      <p className="text-center text-base leading-relaxed text-muted text-balance">
        <Trans
          i18nKey="result.summary"
          values={{ ticketName, validity, price: ticket.price }}
          components={{ strong: <strong className="text-forest" /> }}
        />
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
          partyLabel={partyLabel}
        />
      </div>
    </div>
  );
}
