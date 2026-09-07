import { FormField } from "@/components/forms/FormField";
import type { CustomerFields } from "./useReservationWizard";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side UX validation only — mirrors `ContactForm.tsx`'s pattern
 *  (same email regex), NOT a re-implementation of any server business rule
 *  (name/email/phone shape checks here are presentation convenience; the
 *  authoritative check is `gas/src/Validation.ts`, Global Constraints). */
export function validateCustomerFields(values: CustomerFields): Partial<Record<keyof CustomerFields, string>> {
  const errors: Partial<Record<keyof CustomerFields, string>> = {};
  if (!values.name.trim()) errors.name = "お名前を入力してください。";
  if (!values.email.trim()) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "メールアドレスの形式をご確認ください。";
  }
  return errors;
}

export function CustomerInfoForm({
  values,
  errors,
  onChange,
  onBlur,
}: {
  values: CustomerFields;
  errors: Partial<Record<keyof CustomerFields, string>>;
  onChange: (field: keyof CustomerFields, value: string) => void;
  onBlur: (field: keyof CustomerFields) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FormField
        id="reservation-name"
        label="お名前"
        required
        autoComplete="name"
        value={values.name}
        onChange={(event) => onChange("name", event.target.value)}
        onBlur={() => onBlur("name")}
        error={errors.name}
      />
      <FormField
        id="reservation-email"
        label="メールアドレス"
        required
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        onChange={(event) => onChange("email", event.target.value)}
        onBlur={() => onBlur("email")}
        error={errors.email}
      />
      <FormField
        id="reservation-phone"
        label="電話番号（任意）"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={(event) => onChange("phone", event.target.value)}
        onBlur={() => onBlur("phone")}
        error={errors.phone}
      />
      <FormField
        id="reservation-notes"
        label="備考（任意）"
        as="textarea"
        value={values.notes}
        onChange={(event) => onChange("notes", event.target.value)}
        onBlur={() => onBlur("notes")}
        error={errors.notes}
      />
    </div>
  );
}
