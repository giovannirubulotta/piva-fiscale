import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Da chiamare in ogni Server Component/Action che richiede un utente autenticato. */
export async function richiediUtente() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}
