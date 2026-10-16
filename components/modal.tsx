"use client";

import { useEffect, type ReactNode } from "react";
import { useBodyScrollLock } from "@/lib/hooks";
import { Button, cx } from "./ui";

/**
 * Mobile-first bottom sheet that becomes a centred dialog on larger screens.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-stone-950/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-sheet relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-soft transition-colors hover:bg-surface-3"
          >
            ✕
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && (
          <div className={cx("flex gap-3 border-t border-line px-5 py-4", "safe-bottom")}>{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  loading,
  disabled,
  tone = "danger",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  disabled?: boolean;
  tone?: "danger" | "primary";
}) {
  return (
    <>
      <Button variant="outline" block onClick={onCancel} type="button">
        {cancelLabel}
      </Button>
      <Button
        variant={tone}
        block
        onClick={onConfirm}
        loading={loading}
        disabled={disabled}
        type="button"
      >
        {confirmLabel}
      </Button>
    </>
  );
}
