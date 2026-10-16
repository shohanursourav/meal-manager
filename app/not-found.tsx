"use client";

import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { useI18n } from "@/components/locale-provider";
import { Button, Card, EmptyState } from "@/components/ui";

export default function NotFound() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <EmptyState
            icon="🧭"
            title={t("notFound.title")}
            body={t("notFound.body")}
            action={
              <Button variant="secondary" onClick={() => router.push("/")}>
                {t("notFound.cta")}
              </Button>
            }
          />
        </Card>
      </main>
    </>
  );
}
