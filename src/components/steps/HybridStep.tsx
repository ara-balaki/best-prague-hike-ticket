import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { usePostHog } from "@posthog/react";
import Fuse from "fuse.js";
import type React from "react";
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
  icon: React.ReactNode;
}[] = [
  {
    value: "single",
    title: "1 Adult",
    description: "Single adult",
    icon: <SingleIcon />,
  },
  {
    value: "one-adult-two-children",
    title: "Small Group",
    description: "1 adult + max. 2 children",
    icon: <SmallGroupIcon />,
  },
  {
    value: "two-adults-two-children",
    title: "Large Group",
    description: "2 adults + max. 4 children",
    icon: <LargeGroupIcon />,
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
    minMatchCharLength: 1,
  });

  const results = query.length >= 1 ? fuse.search(query, { limit: 5 }) : [];

  function pick(stop: IStop) {
    setQuery(stop.name);
    setOpen(false);
    setValue("stop", stop.name, { shouldValidate: true });
    posthog?.capture("stop_selected", {
      stop_name: stop.name,
      transport_filter: transport,
    });
  }

  function clear() {
    setQuery("");
    setOpen(false);
    setValue("stop", "", { shouldValidate: false });
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
              setValue("stop", "", { shouldValidate: false });
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                pick(results[0].item);
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off"
            className="w-full rounded-xl border-2 border-forest bg-transparent px-4 py-3 pr-10 text-base text-black outline-none placeholder:text-muted/60 focus:border-forest focus:ring-2 focus:ring-forest/20"
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

        {open && results.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-xl border border-forest/20 bg-cream-card p-1 shadow-lg">
            {results.map(({ item }) => {
              const servingModes = activeModes.filter((m) =>
                isSuburban(item, m),
              );
              return (
                <li
                  key={item.name}
                  onMouseDown={() => pick(item)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-forest/10"
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
          className="flex flex-col gap-2"
        >
          {PARTY_OPTIONS.map(({ value, title, description, icon }) => (
            <Radio.Root
              key={value}
              value={value}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-cream-card px-3 py-3 transition-colors hover:border-forest/30 hover:bg-forest/5 data-checked:border-forest data-checked:bg-cream-card"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-b from-blue-200 to-blue-400 text-white">
                {icon}
              </div>
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

function SingleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22 C4 16 8 14 12 14 C16 14 20 16 20 22 Z" />
    </svg>
  );
}

function SmallGroupIcon() {
  return (
    <svg
      width="24"
      height="20"
      viewBox="0 0 28 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="10" cy="7" r="4" />
      <path d="M2 22 C2 16 6 14 10 14 C14 14 18 16 18 22 Z" />
      <circle cx="22" cy="11" r="2.5" />
      <path d="M17 22 C17 18 19 16.5 22 16.5 C25 16.5 27 18 27 22 Z" />
    </svg>
  );
}

function LargeGroupIcon() {
  return (
    <svg
      width="24"
      height="20"
      viewBox="0 0 32 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="4" />
      <circle cx="22" cy="7" r="4" />
      <path d="M1 22 C1 16 5 14 9 14 C13 14 17 16 17 22 Z" />
      <path d="M14 22 C14 16 18 14 22 14 C26 14 30 16 30 22 Z" />
    </svg>
  );
}
