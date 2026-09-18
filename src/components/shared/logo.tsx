import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Моделкин — главная">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 22V12M12 12L21 7M12 12L3 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-lg font-bold text-ink">Моделкин</span>
    </Link>
  );
}
