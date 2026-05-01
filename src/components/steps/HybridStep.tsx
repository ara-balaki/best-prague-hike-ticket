import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { usePostHog } from "@posthog/react";
import Fuse from "fuse.js";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import {
  isSuburban,
  MODE_EMOJI,
  MODE_LABEL,
  SUBURBAN_MODES,
} from "../../lib/transport";
import type { FormValues, IStop, Party } from "../../types";

interface HybridStepProps {
  stops: IStop[];
}

const PARTY_OPTIONS: {
  value: Party;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "single",
    title: "1 Adult",
    description: "Single adult",
    icon: "👤",
  },
  {
    value: "one-adult-two-children",
    title: "Small Group",
    description: "1 adult + max. 2 children",
    icon: "👨‍👧‍👦",
  },
  {
    value: "two-adults-two-children",
    title: "Large Group",
    description: "2 adults + max. 4 children",
    icon: "👨‍👩‍👧‍👦",
  },
];

export function HybridStep({ stops }: HybridStepProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  const stopValue = useWatch({ control, name: "stop" });
  const transport = useWatch({ control, name: "transport" }) ?? "all";
  const posthog = usePostHog();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => stopValue ?? "");
  const [activeIndex, setActiveIndex] = useState(-1);

  const activeModes =
    transport === "all"
      ? SUBURBAN_MODES
      : SUBURBAN_MODES.filter((m) => m === transport);

  const suburbanStops = stops.filter((s) =>
    activeModes.some((m) => isSuburban(s, m)),
  );

  const fuse = new Fuse(suburbanStops, {
    keys: [
      { name: "searchKey", weight: 1 },
      { name: "name", weight: 0.5 },
    ],
    threshold: 0.35,
    distance: 80,
    minMatchCharLength: 2,
  });

  const results = query.length >= 2 ? fuse.search(query, { limit: 10 }) : [];

  const zoneMatch = query.trim().match(/^(?:zone\s*)?(\d+)$/i);
  const zoneOption = zoneMatch ? parseInt(zoneMatch[1], 10) : null;

  const totalOptions = (zoneOption !== null ? 1 : 0) + results.length;

  function pick(stop: IStop) {
    setQuery(stop.name);
    setOpen(false);
    setActiveIndex(-1);
    setValue("stop", stop.name, { shouldValidate: true });
    setValue("zoneCount", undefined);
    posthog?.capture("stop_selected", {
      stop_name: stop.name,
      transport_filter: transport,
    });
  }

  function pickZone(zone: number) {
    setQuery(`Zone ${zone}`);
    setOpen(false);
    setActiveIndex(-1);
    setValue("stop", `Zone ${zone}`, { shouldValidate: true });
    setValue("zoneCount", zone);
    posthog?.capture("zone_selected", { zone });
  }

  function clear() {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    setValue("stop", "", { shouldValidate: false });
    setValue("zoneCount", undefined);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Destination */}
      <Field.Root className="relative flex flex-col gap-2">
        <Field.Label className="text-sm font-bold text-black">
          Destination Stop
        </Field.Label>
        <input
          type="hidden"
          {...register("stop", { required: "Choose a destination" })}
        />
        <div className="relative">
          <Field.Control
            autoFocus
            type="text"
            value={query}
            placeholder="e.g., Karlštejn (Zone 4)"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
              setValue("stop", "", { shouldValidate: false });
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (!open || totalOptions === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, totalOptions - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const idx = activeIndex >= 0 ? activeIndex : 0;
                if (zoneOption !== null && idx === 0) {
                  pickZone(zoneOption);
                } else {
                  const offset = zoneOption !== null ? 1 : 0;
                  const target = results[idx - offset];
                  if (target) pick(target.item);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off"
            className="w-full rounded-xl border-2 border-forest/10  bg-transparent px-4 py-3 pr-10 text-base text-black outline-none placeholder:text-muted/60 focus:border-forest"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear"
              className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-forest"
            >
              ×
            </button>
          )}
        </div>

        {open && totalOptions > 0 && (
          <ul className="absolute top-full z-10 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-xl border border-forest/20 bg-cream-card p-1 shadow-lg">
            {zoneOption !== null && (
              <li
                onMouseDown={() => pickZone(zoneOption)}
                onMouseEnter={() => setActiveIndex(0)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${activeIndex === 0 ? "bg-forest/10" : "hover:bg-forest/10"}`}
              >
                <span className="text-black">Zone {zoneOption} — all stops</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-1.5 py-0.5 text-xs text-forest">
                  Zone {zoneOption}
                </span>
              </li>
            )}
            {results.map(({ item }, idx) => {
              const offset = zoneOption !== null ? 1 : 0;
              const listIdx = idx + offset;
              const servingModes = activeModes.filter((m) =>
                isSuburban(item, m),
              );
              return (
                <li
                  key={item.name}
                  onMouseDown={() => pick(item)}
                  onMouseEnter={() => setActiveIndex(listIdx)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${listIdx === activeIndex ? "bg-forest/10" : "hover:bg-forest/10"}`}
                >
                  <span className="text-black">{item.name}</span>
                  <div className="flex shrink-0 gap-1">
                    {servingModes.map((m) => (
                      <span
                        key={m}
                        title={MODE_LABEL[m]}
                        className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-1.5 py-0.5 text-xs text-forest"
                      >
                        <span aria-hidden>{MODE_EMOJI[m]}</span>
                        <span className="sr-only">{MODE_LABEL[m]}</span>
                        Zone {item.zones[m]!.join(", ")}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {errors.stop && (
          <p className="text-sm text-red-600">{errors.stop.message}</p>
        )}
      </Field.Root>

      {/* Party */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-black">Who's hiking?</p>
        <RadioGroup
          onValueChange={(v: Party) => {
            setValue("party", v, { shouldValidate: true });
            posthog?.capture("party_selected", { party: v });
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          {PARTY_OPTIONS.map(({ value, title, description, icon }) => (
            <Radio.Root
              key={value}
              value={value}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-cream-card px-3 py-3 transition-colors hover:border-forest/30 hover:bg-forest/5 data-checked:border-forest data-checked:bg-cream-card"
            >
              <span className="shrink-0 text-2xl leading-none">{icon}</span>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-sm font-semibold text-forest">
                  {title}
                </span>
                <span className="text-xs text-muted">{description}</span>
              </div>
              <Radio.Indicator className="hidden" />
            </Radio.Root>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
