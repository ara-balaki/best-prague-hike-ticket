import i18n from "i18next";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { HybridStep } from "./components/steps/HybridStep";
import { ResultStep } from "./components/steps/ResultStep";
import { useAnalytics } from "./lib/analytics";
import { cheapestTicket } from "./lib/ranking";
import { resolveTrip } from "./lib/trip";
import type { FormValues, IStop, IStopsData } from "./types";

function useDocumentMeta() {
  const { t, i18n: inst } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = inst.language;
    document.title = t("meta.title");
    const set = (sel: string, val: string) =>
      document.querySelector(sel)?.setAttribute("content", val);
    set('meta[name="description"]', t("meta.description"));
    set('meta[property="og:title"]', t("meta.title"));
    set('meta[property="og:description"]', t("meta.description"));
    set('meta[name="twitter:title"]', t("meta.title"));
    set('meta[name="twitter:description"]', t("meta.description"));
  }, [inst.language, t]);
}

function App() {
  useDocumentMeta();
  const { t } = useTranslation();
  const [stops, setStops] = useState<IStop[]>([]);
  const [view, setView] = useState<"form" | "result">("form");
  const analytics = useAnalytics();

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
      hasPraguePass: false,
    },
  });

  const goToResult = async () => {
    const isValid = await form.trigger(["stop", "party"]);
    if (!isValid) return;
    const trip = resolveTrip(form.getValues(), stops);
    if (trip) analytics.ticketFound(trip, cheapestTicket(trip));
    setView("result");
  };

  const goToForm = () => setView("form");

  const resetWizard = () => {
    const { stop: stopName, party = "single", transport = "all" } = form.getValues();
    analytics.newSearchStarted({ stopName, party, transport });
    form.reset();
    setView("form");
  };

  const handlePurchaseLinkClick = () => {
    const trip = resolveTrip(form.getValues(), stops);
    if (!trip) return;
    analytics.purchaseClicked(trip, cheapestTicket(trip));
  };

  const stopValue = useWatch({ control: form.control, name: "stop" });
  const partyValue = useWatch({ control: form.control, name: "party" });
  const canContinue = view === "form" ? !!stopValue && !!partyValue : true;

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
              {view === "form" && (
                <h1 className="text-center text-2xl font-bold text-forest sm:text-3xl">
                  {t("app.title")}
                </h1>
              )}
              {view === "form" && (
                <p className="text-center text-base leading-relaxed text-muted">
                  {t("app.description")}
                </p>
              )}
              <div className="flex flex-1 flex-col">
                {view === "form" && <HybridStep stops={stops} />}
                {view === "result" && <ResultStep stops={stops} />}
              </div>
              <div className="mt-auto">
                <NavButtons
                  isResult={view === "result"}
                  canContinue={canContinue}
                  showBack={view === "result"}
                  onBack={goToForm}
                  onNext={goToResult}
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
  const analytics = useAnalytics();

  function toggle() {
    const next = inst.language === "en" ? "cs" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
    analytics.languageChanged(next);
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
