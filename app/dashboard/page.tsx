import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { InvalidMessId } from "@/components/dashboard/invalid-id";
import { isValidUUID } from "@/lib/format";

/**
 * `/dashboard?mess_id=<uuid>`
 *
 * A server component reads the query string so the client bundle only mounts
 * once the mess id is known and validated.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.mess_id;
  const messId = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  if (!messId || !isValidUUID(messId)) {
    return <InvalidMessId />;
  }

  return <DashboardClient messId={messId} />;
}
