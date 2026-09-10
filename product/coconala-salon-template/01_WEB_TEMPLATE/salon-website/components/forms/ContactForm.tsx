"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/FormField";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { Button } from "@/components/ui/Button";
import type { ContactFormValues } from "@/types/content";

type FieldErrors = Partial<Record<keyof ContactFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_TIME_MS = 1500;

function validate(values: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "お名前を入力してください。";
  if (!values.email.trim()) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "メールアドレスの形式が正しくありません。";
  }
  if (!values.message.trim()) errors.message = "お問い合わせ内容を入力してください。";
  if (!values.consent) errors.consent = "プライバシーポリシーへの同意が必要です。";
  return errors;
}

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
};

/**
 * Contact form UI (Phase 2A §15) — field order matches `ContactRequest`
 * (Phase 0 §F): name, email, phone (optional), message, then submit.
 * No real submission endpoint yet (Phase 2B scope): submit simulates the
 * loading → success flow so the UX is demonstrable without a backend.
 */
export function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  // `Date.now()` is impure, so it can't be called during render (as a
  // useRef initializer would be) — it's read once in an effect after
  // mount instead (React Compiler purity rule). This is a client-side,
  // best-effort UX signal only, matching this phase's "no real
  // submission endpoint yet" scope; real enforcement of Phase 0 §P's
  // min-fill-time rule happens server-side once `createInquiry` exists.
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const errors = validate(values);

  function handleChange<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(key: keyof ContactFormValues) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true, message: true, consent: true });

    if (Object.keys(errors).length > 0) return;

    // Anti-spam checks (Phase 0 §P) — silently no-op rather than telling a
    // bot why it failed. A real submission (createInquiry) is out of
    // scope for Phase 2B; this only demonstrates the UI's loading/success
    // states.
    const filledTooFast =
      mountedAt.current !== null && Date.now() - mountedAt.current < MIN_FILL_TIME_MS;
    if (honeypot.trim().length > 0 || filledTooFast) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-sm border border-border bg-surface p-8 text-center"
      >
        <p className="text-[20px] font-medium text-primary">お問い合わせありがとうございます</p>
        <p className="mt-2 text-[15px] leading-[1.7] text-secondary">
          内容を確認の上、担当より折り返しご連絡いたします。
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <HoneypotField value={honeypot} onChange={setHoneypot} />

      <FormField
        id="contact-name"
        label="お名前"
        required
        autoComplete="name"
        value={values.name}
        onChange={(event) => handleChange("name", event.target.value)}
        onBlur={() => handleBlur("name")}
        error={touched.name ? errors.name : undefined}
      />
      <FormField
        id="contact-email"
        label="メールアドレス"
        required
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        onChange={(event) => handleChange("email", event.target.value)}
        onBlur={() => handleBlur("email")}
        error={touched.email ? errors.email : undefined}
      />
      <FormField
        id="contact-phone"
        label="電話番号（任意）"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={(event) => handleChange("phone", event.target.value)}
        onBlur={() => handleBlur("phone")}
        error={touched.phone ? errors.phone : undefined}
      />
      <FormField
        id="contact-message"
        label="お問い合わせ内容"
        as="textarea"
        required
        value={values.message}
        onChange={(event) => handleChange("message", event.target.value)}
        onBlur={() => handleBlur("message")}
        error={touched.message ? errors.message : undefined}
      />

      <div>
        <label className="flex items-start gap-3 text-[14px] leading-[1.6] text-secondary">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => handleChange("consent", event.target.checked)}
            onBlur={() => handleBlur("consent")}
            aria-describedby="consent-error"
            className="mt-1 h-5 w-5 flex-none accent-accent"
          />
          <span>
            <a href="/privacy" className="text-accent underline-offset-4 hover:underline">
              プライバシーポリシー
            </a>
            に同意の上、送信してください。
          </span>
        </label>
        <p id="consent-error" role="alert" aria-live="polite" className="mt-2 min-h-[20px] text-[14px] text-error">
          {touched.consent ? errors.consent : ""}
        </p>
      </div>

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "送信中..." : "送信する"}
      </Button>
    </form>
  );
}
