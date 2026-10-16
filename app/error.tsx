"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { useI18n } from "@/components/locale-provider";
import { Button, Card, EmptyState } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    console.error("[meal-manager]", error);
  }, [error]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <EmptyState
            icon="⚠️"
            title={t("error.title")}
            body={
              <>
                {t("error.body")}
                {error.message ? (
                  <span className="mt-2 block break-words text-xs text-muted">{error.message}</span>
                ) : null}
              </>
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/")}>
                  {t("error.home")}
                </Button>
                <Button onClick={reset}>{t("error.retry")}</Button>
              </div>
            }
          />
        </Card>
      </main>
    </>
  );
}
