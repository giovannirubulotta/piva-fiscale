"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EsitoAuth {
  errore: string | null;
}

export async function accedi(_prev: EsitoAuth, formData: FormData): Promise<EsitoAuth> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { errore: "Email o password non corrette." };
  }

  redirect("/");
}

export async function registrati(_prev: EsitoAuth, formData: FormData): Promise<EsitoAuth> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { errore: "La password deve avere almeno 8 caratteri." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { errore: error.message };
  }

  redirect("/");
}

export async function esci(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
