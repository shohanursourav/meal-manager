"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { useI18n } from "@/components/locale-provider";
import { useToast } from "@/components/toast";
import { Button, Card, Field, Input, Skeleton, cx } from "@/components/ui";
import { createMess, getMess } from "@/lib/data";
import { formatDate, isValidUUID, todayISO } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { getRecentMesses, forgetMess, rememberMess } from "@/lib/recent";
import { describeError } from "@/lib/supabase";

export function LandingScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [recordId, setRecordId] = useState("");
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // localStorage is client-only: the server renders skeleton rows, the client
  // swaps in the real list after hydration. Removed entries are filtered out
  // locally so the list updates without another storage read.
  const hydrated = useHydrated();
  const [hidden, setHidden] = useState<string[]>([]);
  const recent = useMemo(() => {
    const stored = hydrated ? getRecentMesses() : null;
    return stored ? stored.filter((item) => !hidden.includes(item.id)) : null;
  }, [hidden, hydrated]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError(`${t("common.required")}: ${t("landing.form.label")}`);
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const mess = await createMess(trimmed);
      rememberMess(mess);
      toast(t("toast.saved"));
      router.push(`/dashboard?mess_id=${mess.id}`);
    } catch (error) {
      setCreateError(`${t("landing.form.error")} — ${describeError(error)}`);
      setCreating(false);
    }
  }

  async function handleResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = recordId.trim();
    if (!isValidUUID(id)) {
      setResumeError(t("landing.resume.error"));
      return;
    }
    setResuming(true);
    setResumeError(null);
    try {
      const mess = await getMess(id);
      if (!mess) {
        setResumeError(t("landing.resume.error"));
        setResuming(false);
        return;
      }
      rememberMess(mess);
      router.push(`/dashboard?mess_id=${mess.id}`);
    } catch (error) {
      setResumeError(describeError(error));
      setResuming(false);
    }
  }

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        {/* Hero */}
        <section className="px-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/30">
            <span aria-hidden>🍛</span> {t("app.tagline")}
          </span>
          <h1 className="mt-3 whitespace-pre-line text-3xl font-extrabold leading-[1.25] tracking-tight text-ink sm:text-4xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {t("landing.hero.subtitle")}
          </p>
        </section>

        {/* Create mess */}
        <Card className="mt-6 overflow-hidden">
          <div className="bg-brand-500 px-4 py-3">
            <h2 className="text-sm font-bold text-white">{t("landing.form.title")}</h2>
          </div>
          <form onSubmit={handleCreate} className="space-y-4 p-4" noValidate>
            <Field label={t("landing.form.label")} htmlFor="mess-name" error={createError}>
              <Input
                id="mess-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("landing.form.placeholder")}
                autoComplete="off"
                enterKeyHint="go"
                maxLength={120}
                invalid={Boolean(createError)}
                autoFocus
              />
            </Field>
            <Button type="submit" size="lg" block loading={creating}>
              {creating ? t("landing.form.creating") : t("landing.form.submit")}
            </Button>
          </form>
        </Card>

        {/* Resume by record id */}
        <Card className="mt-4 p-4">
          <h2 className="text-sm font-bold text-ink">{t("landing.resume.title")}</h2>
          <form onSubmit={handleResume} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Field label={t("landing.resume.label")} htmlFor="record-id" error={resumeError}>
                <Input
                  id="record-id"
                  name="mess_id"
                  value={recordId}
                  onChange={(event) => setRecordId(event.target.value)}
                  placeholder={t("landing.resume.placeholder")}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="tnum text-sm"
                  invalid={Boolean(resumeError)}
                />
              </Field>
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              loading={resuming}
              className="sm:mt-[1.85rem] sm:self-start"
            >
              {t("landing.resume.submit")}
            </Button>
          </form>
        </Card>

        {/* Recent messes on this device */}
        {(recent === null || recent.length > 0) && (
          <section className="mt-6">
            <h2 className="px-1 text-sm font-bold text-ink">{t("landing.recent.title")}</h2>
            <ul className="mt-3 space-y-2">
              {recent === null
                ? [0, 1].map((index) => <Skeleton key={index} className="h-16" />)
                : recent.map((item) => (
                    <li key={item.id}>
                      <div className="card flex items-center gap-3 p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                          🏠
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                          <p className="tnum truncate text-[0.7rem] text-muted">
                            {formatDate(todayISO(new Date(item.at)), locale)} · {item.id.slice(0, 8)}…
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t("common.delete")}
                          onClick={() => {
                            forgetMess(item.id);
                            setHidden((ids) => [...ids, item.id]);
                          }}
                        >
                          ✕
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/dashboard?mess_id=${item.id}`)}
                        >
                          {t("landing.resume.submit")}
                        </Button>
                      </div>
                    </li>
                  ))}
            </ul>
          </section>
        )}

        {/* Feature highlights */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🍚", title: t("landing.feature.meals"), body: t("landing.feature.meals.desc") },
            { icon: "🧺", title: t("landing.feature.expenses"), body: t("landing.feature.expenses.desc") },
            { icon: "📊", title: t("landing.feature.report"), body: t("landing.feature.report.desc") },
          ].map((feature, index) => (
            <Card key={index} className={cx("p-4", "animate-rise")} as="article">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-xl dark:bg-brand-500/15">
                {feature.icon}
              </span>
              <h3 className="mt-3 text-sm font-bold text-ink">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{feature.body}</p>
            </Card>
          ))}
        </section>

        <p className="mt-8 text-center text-xs text-muted">{t("landing.footer")}</p>
      </main>
    </>
  );
}
