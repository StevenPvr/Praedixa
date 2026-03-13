"use client";

import { useCallback, useState } from "react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { DeploymentRequestAside } from "./DeploymentRequestAside";
import { DeploymentRequestForm } from "./DeploymentRequestForm";
import {
  DeploymentRequestMissingState,
  DeploymentRequestSuccessState,
} from "./DeploymentRequestStates";
import {
  canSubmitDeploymentRequestForm,
  createInitialDeploymentRequestForm,
  getDeploymentRequestFormOptions,
  getDeploymentRequestPageUi,
  hasDeploymentRequestCoreOptions,
} from "./deployment-request.helpers";
import type { DeploymentRequestFormData } from "./deployment-request.types";

type DeploymentRequestStatus = "idle" | "submitting" | "success" | "error";

export function DeploymentRequestPageClient({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const options = getDeploymentRequestFormOptions(dict.form);
  const ui = getDeploymentRequestPageUi(locale);
  const [form, setForm] = useState<DeploymentRequestFormData>(
    createInitialDeploymentRequestForm(),
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [status, setStatus] = useState<DeploymentRequestStatus>("idle");

  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const protocolHref = getLocalizedPath(locale, "deploymentProtocol");
  const homeHref = `/${locale}`;

  const update = useCallback(
    (key: keyof DeploymentRequestFormData, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setStatus("submitting");
      setErrorMsg("");

      try {
        const response = await fetch("/api/deployment-request", {
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

  if (!hasDeploymentRequestCoreOptions(options)) {
    return <DeploymentRequestMissingState homeHref={homeHref} ui={ui} />;
  }

  if (status === "success") {
    return (
      <DeploymentRequestSuccessState
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
        <DeploymentRequestAside
          dict={dict}
          homeHref={homeHref}
          options={options}
          protocolHref={protocolHref}
          ui={ui}
        />
        <DeploymentRequestForm
          dict={dict}
          errorMsg={errorMsg}
          form={form}
          isSubmitDisabled={!canSubmitDeploymentRequestForm(form, status)}
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
