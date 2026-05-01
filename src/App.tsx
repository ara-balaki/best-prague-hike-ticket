import { usePostHog } from "@posthog/react";
import i18n from "i18next";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { HybridStep } from "./components/steps/HybridStep";
import { ResultStep } from "./components/steps/ResultStep";
import { cheapestTicket } from "./lib/ranking";
import { getZoneInfo } from "./lib/transport";
import type { FormValues, IStop, IStopsData } from "./types";

function App() {
  const { t } = useTranslation();
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

  const goNext = async () => {
    const fields: (keyof FormValues)[] = currentStep === 0 ? ["stop", "party"] : [];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    if (currentStep === 0) {
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
    setCurrentStep((s) => Math.min(s + 1, 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

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

  const stopValue = useWatch({ control: form.control, name: "stop" });
  const partyValue = useWatch({ control: form.control, name: "party" });
  const canContinue = currentStep === 0 ? !!stopValue && !!partyValue : true;

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-linear-to-br from-cream via-amber-soft/20 to-sage/20 py-10 px-4 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch gap-8">
          <form
            className="flex flex-col rounded-2xl bg-cream-card p-6 shadow-md"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex flex-1 flex-col gap-5">
              <div className="relative flex items-center justify-center">
                <p className="text-3xl" aria-hidden>⛰️</p>
                <LanguageSwitcher />
              </div>
              {currentStep === 0 && (
                <h1 className="text-center text-2xl font-bold text-forest sm:text-3xl">
                  {t("app.title")}
                </h1>
              )}
              {currentStep === 0 && (
                <p className="text-center text-base leading-relaxed text-muted">
                  {t("app.description")}
                </p>
              )}
              <div className="flex flex-1 flex-col">
                {currentStep === 0 && <HybridStep stops={stops} />}
                {currentStep === 1 && <ResultStep stops={stops} />}
              </div>
              <div className="mt-auto">
                <NavButtons
                  isResult={currentStep === 1}
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
            <Trans
              i18nKey="footer"
              components={{
                link: (
                  <a
                    href="https://pid.cz/en/fares/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-forest"
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>
    </FormProvider>
  );
}

function LanguageSwitcher() {
  const { i18n: inst } = useTranslation();
  const posthog = usePostHog();

  function toggle() {
    const next = inst.language === "en" ? "cs" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
    posthog?.capture("language_changed", { language: next });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-forest"
    >
      {inst.language === "en" ? "CS" : "EN"}
    </button>
  );
}

interface NavButtonsProps {
  isResult: boolean;
  canContinue: boolean;
  showBack: boolean;
  onBack: () => void;
  onNext: () => void;
  onReset: () => void;
  onPurchaseLinkClick: () => void;
}

function NavButtons({
  isResult,
  canContinue,
  showBack,
  onBack,
  onNext,
  onReset,
  onPurchaseLinkClick,
}: NavButtonsProps) {
  const { t } = useTranslation();

  if (isResult) {
    return (
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-center text-xs text-muted">
          <Trans
            i18nKey="result.purchase"
            components={{
              link: (
                <a
                  href="https://pid.cz/en/pid-litacka/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onPurchaseLinkClick}
                  className="underline hover:text-forest"
                />
              ),
            }}
          />
        </p>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-xl border cursor-pointer border-forest/30 bg-cream-card py-3 text-sm font-semibold text-forest hover:bg-forest/5"
        >
          {t("nav.newSearch")}
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
        {t("nav.continue")}
      </button>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-forest/30 bg-cream-card py-3 px-6 text-sm font-semibold text-forest hover:bg-forest/5"
        >
          {t("nav.back")}
        </button>
      )}
    </div>
  );
}

export default App;
