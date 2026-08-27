import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Client Supabase per i Client Component (usa la chiave pubblica anon, protetta da RLS). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
