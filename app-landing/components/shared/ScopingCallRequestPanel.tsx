"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createScopingCallCopy,
  createInitialScopingCallForm,
  clearScopingFieldError,
  validateScopingCallForm,
} from "./scoping-call.helpers";
import { ScopingCallForm } from "./ScopingCallForm";
import { ScopingCallSuccessState } from "./ScopingCallSuccessState";
import type {
  ScopingCallRequestPanelProps,
  ScopingCallFormData,
  ScopingFieldErrors,
} from "./scoping-call.types";

export function ScopingCallRequestPanel({
  className,
  defaultCompanyName,
  defaultEmail,
  locale,
  source = "unknown",
}: ScopingCallRequestPanelProps) {
  const copy = createScopingCallCopy(locale);
  const [form, setForm] = useState<ScopingCallFormData>(
    createInitialScopingCallForm(defaultCompanyName, defaultEmail),
  );
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ScopingFieldErrors>({});

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      companyName: prev.companyName || defaultCompanyName || "",
      email: prev.email || defaultEmail || "",
    }));
  }, [defaultCompanyName, defaultEmail]);

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) {
      return;
    }

    setForm((prev) => (prev.timezone ? prev : { ...prev, timezone }));
  }, []);

  const update = useCallback(
    (key: keyof ScopingCallFormData, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => clearScopingFieldError(prev, key));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setErrorMsg("");

      const errors = validateScopingCallForm(copy, form);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setStatus("error");
        return;
      }

      setStatus("submitting");
      try {
        const response = await fetch("/api/scoping-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            email: form.email,
            companyName: form.companyName,
            timezone: form.timezone,
            slots: [form.slot1, form.slot2, form.slot3],
            notes: form.notes,
            source,
            website: form.website,
          }),
        });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || payload.error) {
          setErrorMsg(payload.error ?? copy.unknownError);
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(copy.networkError);
        setStatus("error");
      }
    },
    [copy, form, locale, source],
  );

  if (status === "success") {
    return (
      <ScopingCallSuccessState
        {...(className !== undefined ? { className } : {})}
        copy={copy}
      />
    );
  }

  return (
    <div {...(className !== undefined ? { className } : {})}>
      <ScopingCallForm
        copy={copy}
        errorMsg={errorMsg}
        fieldErrors={fieldErrors}
        form={form}
        isFr={locale === "fr"}
        onSubmit={handleSubmit}
        status={status}
        update={update}
      />
    </div>
  );
}
