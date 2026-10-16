import { ConfigNotice } from "@/components/config-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { LandingScreen } from "@/components/landing/landing-screen";

/**
 * `/` — the landing screen. Renders the Supabase setup notice until the
 * required env vars exist, otherwise the create/resume mess flow.
 */
export default function HomePage() {
  if (!isSupabaseConfigured) return <ConfigNotice />;
  return <LandingScreen />;
}
