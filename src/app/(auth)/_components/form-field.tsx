import type { InputHTMLAttributes, ReactNode } from "react";
import { clsx } from "@shared/utils/clsx";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  labelRight?: ReactNode;
}

/** Labeled text input with an inline error state matching design.pdf pages 6/8 (red border + red helper text). */
export function FormField({ label, error, labelRight, className, id, ...inputProps }: FormFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelRight}
      </div>
      <input
        id={id}
        className={clsx(
          "mt-1.5 w-full rounded-control border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-primary",
          error ? "border-danger" : "border-border",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
