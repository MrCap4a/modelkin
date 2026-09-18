import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@shared/utils/clsx";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  pending?: boolean;
  fullWidth?: boolean;
}

export function SubmitButton({
  variant = "primary",
  pending,
  fullWidth,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={clsx(
        "rounded-control px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth ? "w-full" : "",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary-hover"
          : "border border-border text-ink hover:bg-surface-alt",
        className,
      )}
      {...props}
    >
      {pending ? "Подождите..." : children}
    </button>
  );
}
