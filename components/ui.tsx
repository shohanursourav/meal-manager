"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/* --------------------------------- Button -------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-500/50",
  secondary:
    "bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100 active:bg-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/30 dark:hover:bg-brand-500/25",
  outline:
    "bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-2 active:bg-surface-3",
  ghost: "bg-transparent text-ink-soft hover:bg-surface-2 active:bg-surface-3",
  danger:
    "bg-danger-soft text-danger ring-1 ring-danger/25 hover:brightness-95 active:brightness-90 dark:hover:brightness-125",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-4 text-[0.95rem] rounded-2xl gap-2",
  lg: "h-12 px-5 text-base rounded-2xl gap-2",
  icon: "h-10 w-10 rounded-xl justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, block = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
});

/* ---------------------------------- Card --------------------------------- */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={cx("card", className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[0.95rem] font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* --------------------------------- Fields -------------------------------- */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink-soft">
        <span>{label}</span>
        {hint && <span className="text-[0.7rem] font-medium text-muted">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

const CONTROL =
  "w-full rounded-2xl border border-line bg-surface-2 px-3.5 text-ink placeholder:text-muted/70 transition-colors focus:border-brand-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, "h-12 text-base", invalid && "border-danger focus:ring-danger/25", className)}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cx(CONTROL, "h-12 appearance-none bg-[length:1rem] pr-9 text-base", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23f97316' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M5 8l5 5 5-5'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.85rem center",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

/** Money input with a leading ৳ prefix. */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function MoneyInput({ className, invalid, ...rest }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-base font-bold text-brand-500">
        ৳
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        className={cx(
          CONTROL,
          "tnum h-12 pl-10 text-base font-semibold",
          invalid && "border-danger focus:ring-danger/25",
          className,
        )}
        {...rest}
      />
    </div>
  );
});

/* ---------------------------------- Bits --------------------------------- */

export function Badge({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  tone?: "brand" | "success" | "danger" | "neutral";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/30",
    success:
      "bg-success-soft text-success ring-success/25",
    danger: "bg-danger-soft text-danger ring-danger/25",
    neutral: "bg-surface-2 text-ink-soft ring-line-strong",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "brand",
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "brand" | "success" | "danger" | "neutral";
  icon?: ReactNode;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-surface-2 text-ink-soft",
  } as const;
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2">
        {icon && <span className={cx("grid h-7 w-7 place-items-center rounded-lg text-sm", tones[tone])}>{icon}</span>}
        <p className="text-[0.7rem] font-bold uppercase tracking-wide text-muted">{label}</p>
      </div>
      <p className="tnum mt-2 text-xl font-extrabold leading-tight text-ink">{value}</p>
      {sub && <p className="tnum mt-0.5 text-xs font-medium text-muted">{sub}</p>}
    </div>
  );
}

export function Avatar({ name, seed, size = 40 }: { name: string; seed: string; size?: number }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  const palette = ["#f97316", "#ea580c", "#d97706", "#c2410c", "#b45309", "#fb923c"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  const color = palette[hash % palette.length];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {letters || "?"}
    </span>
  );
}

export function EmptyState({
  icon = "🍽️",
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl dark:bg-brand-500/15">
        {icon}
      </span>
      <div>
        <p className="font-bold text-ink">{title}</p>
        {body && <p className="mt-1 text-sm text-muted">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-surface-3", className)} />;
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "danger" }) {
  const tones = {
    brand: "bg-brand-500",
    success: "bg-success",
    danger: "bg-danger",
  } as const;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Divider({ children }: { children?: ReactNode }) {
  if (!children) return <hr className="border-line" />;
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-line" />
      <span className="text-xs font-bold uppercase tracking-wide text-muted">{children}</span>
      <hr className="flex-1 border-line" />
    </div>
  );
}

export { cx };
