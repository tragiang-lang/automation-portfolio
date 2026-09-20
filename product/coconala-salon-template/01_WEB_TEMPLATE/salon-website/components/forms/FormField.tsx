import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const fieldClasses =
  "w-full min-h-[44px] rounded-sm border border-border bg-surface px-4 py-3 text-[16px] text-primary placeholder:text-muted focus-visible:border-accent";

type BaseProps = {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
    as?: "input";
  };

type TextareaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> & {
    as: "textarea";
  };

type FormFieldProps = InputProps | TextareaProps;

/**
 * Label + input/textarea + inline error, the shared shape every Contact
 * form field uses (Phase 2A §15/§19): a real, visible `<label for>` (never
 * placeholder-as-label), and an error associated via `aria-describedby`
 * inside an `aria-live="polite"` region so it's announced, not just shown.
 */
export function FormField(props: FormFieldProps) {
  const { id, label, error, required } = props;
  const errorId = `${id}-error`;

  const sharedProps = {
    id,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    "aria-required": required,
    className: cn(fieldClasses, error && "border-error"),
  };

  const {
    id: _id,
    label: _label,
    error: _error,
    required: _required,
    as: _as,
    ...domProps
  } = props;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[14px] font-medium text-primary">
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-accent">*</span> : null}
      </label>
      {props.as === "textarea" ? (
        <textarea rows={5} {...sharedProps} {...(domProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...sharedProps} {...(domProps as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      <p id={errorId} role="alert" aria-live="polite" className="mt-2 min-h-[20px] text-[14px] text-error">
        {error ? (
          <span className="inline-flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.2" r="0.9" fill="currentColor" />
            </svg>
            {error}
          </span>
        ) : null}
      </p>
    </div>
  );
}
