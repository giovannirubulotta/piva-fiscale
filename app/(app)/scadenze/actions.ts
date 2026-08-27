"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { segnaScadenza } from "@/lib/data/scadenzeStato";

export async function segnaPagata(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const chiave = String(formData.get("chiave"));
  const importo = Number(formData.get("importo"));
  await segnaScadenza(supabase, user.id, chiave, true, Number.isFinite(importo) ? importo : undefined);
  revalidatePath("/", "layout");
}

export async function segnaNonPagata(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const chiave = String(formData.get("chiave"));
  await segnaScadenza(supabase, user.id, chiave, false);
  revalidatePath("/", "layout");
}
