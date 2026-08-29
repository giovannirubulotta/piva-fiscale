import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/** Client Supabase per Server Component e Server Action: legge/scrive i cookie di sessione. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Unico catch vuoto ammesso nel progetto, e per una ragione precisa:
            // Next.js vieta di scrivere cookie da un Server Component, quindi
            // setAll lancia in quel contesto. Non è un guasto da registrare —
            // è il flusso normale, e il middleware rinfresca comunque la
            // sessione a ogni richiesta. Registrarlo riempirebbe il log di
            // rumore nascondendo gli errori veri.
          }
        },
      },
    }
  );
}
