"use client";

import { useState } from "react";

import { ConfirmFooter, Modal } from "@/components/modal";
import { useI18n } from "@/components/locale-provider";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Field, Input, Stat } from "@/components/ui";
import { deleteMess, renameMess } from "@/lib/data";
import { formatMeals, formatMoney } from "@/lib/format";
import { forgetMess } from "@/lib/recent";
import { describeError } from "@/lib/supabase";
import type { Mess, MessSummary } from "@/lib/types";

export function MessIntro({
  mess,
  summary,
  memberCount,
  monthMeals,
  onRenamed,
  onDeleted,
}: {
  mess: Mess;
  summary: MessSummary;
  memberCount: number;
  monthMeals: number;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const { t, locale } = useI18n();
  const { toast } = useToast();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(mess.name);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    const url = `${window.location.origin}/dashboard?mess_id=${mess.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("dashboard.share.copied"));
    } catch {
      // Clipboard API needs HTTPS/localhost — fall back to a prompt.
      window.prompt(t("dashboard.share"), url);
    }
  }

  async function handleRename() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setError(`${t("common.required")}: ${t("landing.form.label")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renameMess(mess.id, trimmed);
      onRenamed(trimmed);
      setRenameOpen(false);
      toast(t("dashboard.renamed"));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteMess(mess.id);
      forgetMess(mess.id);
      onDeleted();
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pt-4">
      <Card className="overflow-hidden">
        <div className="bg-brand-500 px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 text-xl">
              🏠
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wide text-white/80">
                {t("dash.mess")}
              </p>
              <h1 className="truncate text-xl font-extrabold leading-tight text-white">{mess.name}</h1>
              <p className="tnum mt-0.5 text-[0.7rem] text-white/75">
                {t("common.member")}: {formatMeals(memberCount, locale)} · {mess.id.slice(0, 8)}…
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 text-white ring-white/30 hover:bg-white/30 dark:bg-white/20 dark:text-white dark:ring-white/30"
              onClick={() => void copyLink()}
            >
              <span aria-hidden>🔗</span> {t("dashboard.share")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 text-white ring-white/30 hover:bg-white/30 dark:bg-white/20 dark:text-white dark:ring-white/30"
              onClick={() => {
                setNameDraft(mess.name);
                setError(null);
                setRenameOpen(true);
              }}
            >
              <span aria-hidden>✏️</span> {t("dashboard.rename")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto bg-white/20 text-white ring-white/30 hover:bg-white/30 dark:bg-white/20 dark:text-white dark:ring-white/30"
              onClick={() => {
                setConfirmText("");
                setError(null);
                setDeleteOpen(true);
              }}
              aria-label={t("dashboard.delete")}
            >
              <span aria-hidden>🗑️</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Stat
            label={t("dash.summary.rate")}
            value={formatMoney(summary.mealRate, locale)}
            sub={t("dash.summary.eachMeal")}
            icon="🍽️"
          />
          <Stat
            label={t("dash.summary.totalExpenses")}
            value={formatMoney(summary.totalExpenses, locale)}
            icon="🧺"
          />
          <Stat
            label={t("dash.summary.totalMeals")}
            value={formatMeals(summary.totalMeals, locale)}
            icon="🍚"
          />
          <Stat
            label={t("dash.meals.totalMeals.month")}
            value={formatMeals(monthMeals, locale)}
            icon="📅"
            tone="neutral"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          <Badge tone="success">
            ▲ {t("dash.summary.receivable")}: {formatMoney(summary.memberTotals.reduce((acc, m) => acc + Math.max(0, m.balance), 0), locale)}
          </Badge>
          <Badge tone="danger">
            ▼ {t("dash.summary.payable")}: {formatMoney(summary.memberTotals.reduce((acc, m) => acc + Math.min(0, m.balance), 0), locale)}
          </Badge>
        </div>
      </Card>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={t("dashboard.rename")}
        footer={
          <ConfirmFooter
            tone="primary"
            onCancel={() => setRenameOpen(false)}
            onConfirm={() => void handleRename()}
            confirmLabel={t("common.save")}
            cancelLabel={t("common.cancel")}
            loading={busy}
          />
        }
      >
        <Field label={t("landing.form.label")} error={error}>
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            maxLength={120}
            autoFocus
          />
        </Field>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("dashboard.delete")}
        subtitle={`${t("dashboard.delete.confirm")}${mess.name}`}
        footer={
          <ConfirmFooter
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => void handleDelete()}
            confirmLabel={t("common.delete")}
            cancelLabel={t("common.cancel")}
            loading={busy}
            disabled={confirmText.trim() !== mess.name}
          />
        }
      >
        <Field label={t("landing.form.label")} error={error}>
          <Input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={mess.name}
            autoComplete="off"
          />
        </Field>
      </Modal>
    </section>
  );
}
