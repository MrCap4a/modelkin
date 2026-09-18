import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@shared/utils/clsx";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  pending?: boolean;
}

export function SubmitButton({ variant = "primary", pending, className, children, ...props }: Props) {
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={clsx(
        "w-full rounded-control px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary-hover"
          : "border border-primary text-primary hover:bg-primary-subtle",
        className,
      )}
      {...props}
    >
      {pending ? "Подождите..." : children}
    </button>
  );
}
