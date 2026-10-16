"use client";

import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { useI18n } from "@/components/locale-provider";
import { Button, Card, EmptyState } from "@/components/ui";

/** Shown when `/dashboard` is opened without a valid `mess_id`. */
export function InvalidMessId() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <EmptyState
            icon="🔗"
            title={t("dashboard.invalidId")}
            body={
              <>
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">/dashboard?mess_id=&lt;uuid&gt;</code>{" "}
                — {t("dashboard.notFound.body")}
              </>
            }
            action={
              <Button variant="secondary" onClick={() => router.push("/")}>
                {t("error.home")}
              </Button>
            }
          />
        </Card>
      </main>
    </>
  );
}
