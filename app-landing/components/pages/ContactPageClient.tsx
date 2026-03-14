"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getContactIntentQueryValue, type Locale } from "../../lib/i18n/config";
import { ContactPageAside } from "./ContactPageAside";
import { ContactPageForm } from "./ContactPageForm";
import { ContactPageSuccessState } from "./ContactPageSuccessState";
import { createInitialContactForm } from "./contact-page.constants";
import { getContactPageCopy } from "./contact-page.copy";
import {
  canSubmitContactForm,
  clearFieldError,
  focusFirstContactError,
  validateContactForm,
} from "./contact-page.helpers";
import type {
  ContactChallenge,
  ContactIntent,
  ContactFormData,
  FieldErrors,
} from "./contact-page.types";

type ContactStatus = "idle" | "submitting" | "success" | "error";

export function ContactPageClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const intent = resolveContactIntent(searchParams.get("intent"));
  const copy = getContactPageCopy(locale, intent);
  const [captcha, setCaptcha] = useState<ContactChallenge | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [form, setForm] = useState<ContactFormData>(
    createInitialContactForm(locale, intent),
  );
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setForm((prev) => ({
      ...createInitialContactForm(locale, intent),
      ...prev,
      locale,
      intent,
    }));
  }, [intent, locale]);

  const update = useCallback(
    (key: keyof ContactFormData, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => clearFieldError(prev, key));
    },
    [],
  );

  const loadCaptchaChallenge = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await fetch("/api/contact/challenge", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as Partial<ContactChallenge> & {
        error?: string;
      };

      if (
        !response.ok ||
        typeof payload.captchaA !== "number" ||
        typeof payload.captchaB !== "number" ||
        typeof payload.challengeToken !== "string"
      ) {
        setCaptcha(null);
        setForm((prev) => ({ ...prev, captchaAnswer: "", challengeToken: "" }));
        return;
      }

      const nextCaptcha: ContactChallenge = {
        captchaA: payload.captchaA,
        captchaB: payload.captchaB,
        challengeToken: payload.challengeToken,
      };
      setCaptcha(nextCaptcha);
      setForm((prev) => ({
        ...prev,
        captchaAnswer: "",
        challengeToken: nextCaptcha.challengeToken,
      }));
    } catch {
      setCaptcha(null);
      setForm((prev) => ({ ...prev, captchaAnswer: "", challengeToken: "" }));
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCaptchaChallenge();
  }, [loadCaptchaChallenge]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const errors = validateContactForm(form, copy, captcha, captchaLoading);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setErrorMsg(copy.fixErrors);
        setStatus("error");
        focusFirstContactError(errors);
        return;
      }

      setStatus("submitting");
      setErrorMsg("");

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            captchaAnswer: Number(form.captchaAnswer),
          }),
        });

        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
        };
        if (!response.ok || payload.error) {
          setErrorMsg(payload.error ?? copy.unknownError);
          setStatus("error");
          if (payload.error === "Test anti-spam invalide.") {
            void loadCaptchaChallenge();
          }
          return;
        }

        setStatus("success");
      } catch {
        setErrorMsg(copy.networkError);
        setStatus("error");
      }
    },
    [captcha, captchaLoading, copy, form, loadCaptchaChallenge],
  );

  if (status === "success") {
    return (
      <ContactPageSuccessState
        companyName={form.companyName}
        copy={copy}
        email={form.email}
        locale={locale}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid grid-cols-1 gap-7 md:grid-cols-[0.74fr_1.26fr] md:gap-10">
        <ContactPageAside copy={copy} locale={locale} />
        <ContactPageForm
          captcha={captcha}
          captchaLoading={captchaLoading}
          copy={copy}
          errorMsg={errorMsg}
          fieldErrors={fieldErrors}
          form={form}
          isFr={locale === "fr"}
          isSubmitDisabled={
            !canSubmitContactForm(form, captcha, captchaLoading) ||
            status === "submitting"
          }
          loadCaptchaChallenge={loadCaptchaChallenge}
          locale={locale}
          onSubmit={handleSubmit}
          status={status}
          update={update}
        />
      </div>
    </div>
  );
}

function resolveContactIntent(intent: string | null): ContactIntent {
  const proofIntents = new Set([
    getContactIntentQueryValue("fr", "historical_proof"),
    getContactIntentQueryValue("en", "historical_proof"),
    "proof",
  ]);

  if (intent && proofIntents.has(intent)) {
    return "historical_proof";
  }

  return "deployment";
}
