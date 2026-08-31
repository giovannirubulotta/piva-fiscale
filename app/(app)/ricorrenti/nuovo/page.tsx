import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiListino } from "@/lib/data/listino";
import { nomeCliente } from "@/lib/domain/cliente";
import { IntestazionePagina, Scheda, Vuoto } from "@/components/Pagina";
import { NuovaSerieForm } from "./NuovaSerieForm";

export const metadata = { title: "Nuova serie ricorrente — GAR Studio" };

export default async function PaginaNuovaSerie() {
  const { supabase, user } = await richiediUtente();
  const [clienti, listino] = await Promise.all([
    leggiClienti(supabase, user.id),
    leggiListino(supabase, user.id, true),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <IntestazionePagina
        titolo="Nuova serie ricorrente"
        ritorno={{ href: "/ricorrenti", testo: "Ricorrenti" }}
        descrizione="Definisci una volta il canone: da lì in poi l'applicazione tiene il conto delle scadenze e ti dice quando è ora di fatturare."
      />

      {clienti.length === 0 ? (
        <Scheda>
          <Vuoto
            messaggio="Serve almeno un cliente prima di impostare un canone."
            azione={{ href: "/clienti/nuovo", testo: "Aggiungi un cliente" }}
          />
        </Scheda>
      ) : (
        <NuovaSerieForm
          clienti={clienti.map((c) => ({ id: c.id, nome: nomeCliente(c) }))}
          listino={listino.map((v) => ({
            id: v.id,
            descrizione: v.descrizione,
            prezzoUnitario: v.prezzoUnitario,
            unitaMisura: v.unitaMisura,
          }))}
          oggi={new Date().toISOString().slice(0, 10)}
        />
      )}

      <p className="text-xs text-ink-faint">
        Le fatture non partono da sole.{" "}
        <Link href="/ricorrenti" className="text-accent hover:underline">
          La serie
        </Link>{" "}
        propone la scadenza maturata e la fattura nasce in bozza: un documento fiscale con un
        progressivo che non si riusa non va emesso da un processo notturno.
      </p>
    </div>
  );
}
