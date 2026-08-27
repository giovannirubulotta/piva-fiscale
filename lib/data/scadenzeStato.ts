import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface StatoScadenza {
  chiave: string;
  pagato: boolean;
  dataPagamento: string | null;
  importoPagato: number | null;
}

export async function leggiStatiScadenze(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Map<string, StatoScadenza>> {
  const { data, error } = await supabase.from("fiscale_scadenze_stato").select("*").eq("user_id", userId);
  if (error) throw error;
  const mappa = new Map<string, StatoScadenza>();
  for (const r of data ?? []) {
    mappa.set(r.chiave, {
      chiave: r.chiave,
      pagato: r.pagato,
      dataPagamento: r.data_pagamento,
      importoPagato: r.importo_pagato !== null ? Number(r.importo_pagato) : null,
    });
  }
  return mappa;
}

export async function segnaScadenza(
  supabase: SupabaseClient<Database>,
  userId: string,
  chiave: string,
  pagato: boolean,
  importo?: number
): Promise<void> {
  const { error } = await supabase.from("fiscale_scadenze_stato").upsert(
    {
      user_id: userId,
      chiave,
      pagato,
      data_pagamento: pagato ? new Date().toISOString().slice(0, 10) : null,
      importo_pagato: pagato ? (importo ?? null) : null,
    },
    { onConflict: "user_id,chiave" }
  );
  if (error) throw error;
}
