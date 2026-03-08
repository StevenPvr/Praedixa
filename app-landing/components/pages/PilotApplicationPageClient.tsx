"use client";

import { useCallback, useState } from "react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { PilotApplicationAside } from "./PilotApplicationAside";
import { PilotApplicationForm } from "./PilotApplicationForm";
import { PilotApplicationMissingState, PilotApplicationSuccessState } from "./PilotApplicationStates";
import {
  canSubmitPilotForm,
  createInitialPilotForm,
  getPilotFormOptions,
  getPilotPageUi,
  hasPilotCoreOptions,
} from "./pilot-application.helpers";
import type { PilotFormData } from "./pilot-application.types";

type PilotStatus = "idle" | "submitting" | "success" | "error";

export function PilotApplicationPageClient({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const options = getPilotFormOptions(dict.form);
  const ui = getPilotPageUi(locale);
  const [form, setForm] = useState<PilotFormData>(createInitialPilotForm());
  const [errorMsg, setErrorMsg] = useState("");
  const [status, setStatus] = useState<PilotStatus>("idle");

  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const protocolHref = `/${locale}/pilot-protocol`;
  const homeHref = `/${locale}`;

  const update = useCallback((key: keyof PilotFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setStatus("submitting");
      setErrorMsg("");

      try {
        const response = await fetch("/api/pilot-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const payload = (await response.json()) as { success?: boolean; error?: string };
        if (!response.ok || payload.error) {
          setErrorMsg(payload.error ?? ui.unknownError);
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(ui.networkError);
        setStatus("error");
      }
    },
    [form, ui.networkError, ui.unknownError],
  );

  if (!hasPilotCoreOptions(options)) {
    return <PilotApplicationMissingState homeHref={homeHref} ui={ui} />;
  }

  if (status === "success") {
    return (
      <PilotApplicationSuccessState
        companyName={form.companyName}
        dict={dict}
        email={form.email}
        homeHref={homeHref}
        locale={locale}
        protocolHref={protocolHref}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid grid-cols-1 gap-7 md:grid-cols-[0.7fr_1.3fr] md:gap-10">
        <PilotApplicationAside
          dict={dict}
          homeHref={homeHref}
          options={options}
          protocolHref={protocolHref}
          ui={ui}
        />
        <PilotApplicationForm
          dict={dict}
          errorMsg={errorMsg}
          form={form}
          isSubmitDisabled={!canSubmitPilotForm(form, status)}
          onSubmit={handleSubmit}
          options={options}
          privacyHref={privacyHref}
          status={status}
          termsHref={termsHref}
          ui={ui}
          update={update}
        />
      </div>
    </div>
  );
}
