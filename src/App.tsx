import { usePostHog } from "@posthog/react";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { HybridStep } from "./components/steps/HybridStep";
import { ResultStep } from "./components/steps/ResultStep";
import { cheapestTicket } from "./lib/ranking";
import { getZoneInfo } from "./lib/transport";
import type { FormValues, IStop, IStopsData } from "./types";

interface StepConfig {
  id: "transport" | "destination" | "party" | "hybrid" | "result";
  label: string;
  title?: string;
  description?: string;
  fields: readonly (keyof FormValues)[];
}

const STEPS: StepConfig[] = [
  {
    id: "hybrid",
    label: "Your Trip",
    title: "Prague Hike Ticket Finder",
    description:
      "Find the best ticket for your hike to suburban stops around Prague. Zones are counted from the city centre (P, 0, B).",
    fields: ["stop", "party"],
  },
  {
    id: "result",
    label: "Ticket",
    description: "",
    fields: [],
  },
];

function App() {
  const [stops, setStops] = useState<IStop[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const posthog = usePostHog();

  useEffect(() => {
    fetch("/stops.json")
      .then((r) => r.json())
      .then((data: IStopsData) => setStops(data.stops));
  }, []);

  const form = useForm<FormValues>({
    mode: "onTouched",
    defaultValues: {
      stop: "",
      transport: "all" as const,
    },
  });

  const step = STEPS[currentStep];

  const goNext = async () => {
    const isValid = await form.trigger(step.fields);
    if (!isValid) return;
    if (step.id === "hybrid") {
      const { stop: stopName, party = "single", transport = "all", zoneCount } = form.getValues();
      const count = zoneCount ?? (() => {
        const stop = stops.find((s) => s.name === stopName);
        return stop ? getZoneInfo(stop, transport).count : null;
      })();
      if (count !== null) {
        const ticket = cheapestTicket(count, party);
        posthog?.capture("ticket_found", {
          stop_name: stopName,
          zone_count: count,
          party,
          transport_filter: transport,
          ticket_id: ticket.id,
          ticket_name: ticket.name,
          ticket_price: ticket.price,
        });
      }
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const resetWizard = () => {
    const { stop: stopName, party = "single", transport = "all" } = form.getValues();
    posthog?.capture("new_search_started", {
      previous_stop: stopName,
      previous_party: party,
      previous_transport_filter: transport,
    });
    form.reset();
    setCurrentStep(0);
  };

  const handlePurchaseLinkClick = () => {
    const { stop: stopName, party = "single", transport = "all", zoneCount } = form.getValues();
    const count = zoneCount ?? (() => {
      const stop = stops.find((s) => s.name === stopName);
      return stop ? getZoneInfo(stop, transport).count : null;
    })();
    if (count !== null) {
      const ticket = cheapestTicket(count, party);
      posthog?.capture("purchase_link_clicked", {
        stop_name: stopName,
        zone_count: count,
        party,
        transport_filter: transport,
        ticket_id: ticket.id,
        ticket_name: ticket.name,
        ticket_price: ticket.price,
      });
    }
  };

  const isResult = step.id === "result";
  const isAutoAdvance = step.id === "transport";
  const stopValue = useWatch({ control: form.control, name: "stop" });
  const partyValue = useWatch({ control: form.control, name: "party" });
  const canContinue = step.id === "hybrid" ? !!stopValue && !!partyValue : true;

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-linear-to-br from-cream via-amber-soft/20 to-sage/20 py-10 px-4 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch gap-8">
          <form
            className="flex flex-col rounded-2xl bg-cream-card p-6 shadow-md"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex flex-1 flex-col gap-5">
              <p className="text-center text-3xl" aria-hidden>
                ⛰️
              </p>
              {step.title && (
                <h1 className="text-center text-2xl font-bold text-forest sm:text-3xl">
                  {step.title}
                </h1>
              )}
              {step.description && (
                <p className="text-center text-base leading-relaxed text-muted">
                  {step.description}
                </p>
              )}

              <div className="flex flex-1 flex-col">
                {step.id === "hybrid" && <HybridStep stops={stops} />}
                {step.id === "result" && <ResultStep stops={stops} />}
              </div>

              <div className="mt-auto">
                <NavButtons
                  isResult={isResult}
                  isAutoAdvance={isAutoAdvance}
                  canContinue={canContinue}
                  showBack={currentStep > 0}
                  onBack={goBack}
                  onNext={goNext}
                  onReset={resetWizard}
                  onPurchaseLinkClick={handlePurchaseLinkClick}
                />
              </div>
            </div>
          </form>
          <p className="text-center text-xs text-muted/60">
            Data sourced from{" "}
            <a
              href="https://pid.cz/en/fares/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-forest"
            >
              pid.cz
            </a>
            , valid for 2026.
          </p>
        </div>
      </div>
    </FormProvider>
  );
}

interface NavButtonsProps {
  isResult: boolean;
  isAutoAdvance: boolean;
  canContinue: boolean;
  showBack: boolean;
  onBack: () => void;
  onNext: () => void;
  onReset: () => void;
  onPurchaseLinkClick: () => void;
}

function NavButtons({
  isResult,
  isAutoAdvance,
  canContinue,
  showBack,
  onBack,
  onNext,
  onReset,
  onPurchaseLinkClick,
}: NavButtonsProps) {
  if (isResult) {
    return (
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-center text-xs text-muted">
          Purchase via the{" "}
          <a
            href="https://pid.cz/en/pid-litacka/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onPurchaseLinkClick}
            className="underline hover:text-forest"
          >
            PID Lítačka app
          </a>{" "}
          or official PID channels.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-xl border cursor-pointer border-forest/30 bg-cream-card py-3 text-sm font-semibold text-forest hover:bg-forest/5"
        >
          New Search
        </button>
      </div>
    );
  }

  if (isAutoAdvance) {
    if (!showBack) return null;
    return (
      <div className="mt-2 flex">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border cursor-pointer border-forest/30 bg-cream-card py-3 text-sm font-semibold text-forest hover:bg-forest/5"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="flex-1 rounded-xl py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-sage/40 cursor-pointer disabled:text-white/60 bg-forest"
      >
        Continue
      </button>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-forest/30 bg-cream-card py-3 px-6 text-sm font-semibold text-forest hover:bg-forest/5"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

export default App;
