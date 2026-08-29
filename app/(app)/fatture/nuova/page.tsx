import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiDatiEmittente } from "@/lib/data/profilo";
import { leggiFatture } from "@/lib/data/fatture";
import { numeroFattura } from "@/lib/domain/fattura";
import { oggiRoma } from "@/lib/domain/fatturaXml";
import { NuovaFatturaForm } from "../NuovaFatturaForm";

export default async function PaginaNuovaFattura() {
  const { supabase, user } = await richiediUtente();
  const [clienti, emittente, fatture] = await Promise.all([
    leggiClienti(supabase, user.id),
    leggiDatiEmittente(supabase, user.id),
    leggiFatture(supabase, user.id),
  ]);

  if (clienti.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Serve prima un cliente</h1>
        <p className="text-sm text-ink-muted mb-6">
          Una fattura ha bisogno di un intestatario. Crea il primo cliente in anagrafica, poi torna qui.
        </p>
        <Link href="/clienti/nuovo" className="btn-primario inline-block">
          Crea il primo cliente
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/fatture" className="text-xs text-ink-muted hover:text-ink">
          ← Fatture
        </Link>
        <h1 className="text-xl font-semibold mt-2 mb-1">Nuovo documento</h1>
        <p className="text-sm text-ink-muted">
          L&apos;anteprima a fianco si aggiorna mentre compili. Bollo e importi sono calcolati automaticamente.
        </p>
      </div>

      <NuovaFatturaForm
        oggi={oggiRoma()}
        emittente={
          emittente ?? {
            partitaIva: null, codiceFiscale: null, nome: null, cognome: null, indirizzo: null,
            numeroCivico: null, cap: null, comune: null, provincia: null, nazione: "IT",
            email: null, telefono: null, iban: null, bolloRiaddebitato: true,
          }
        }
        clienti={clienti.map((c) => ({
          id: c.id,
          nome: c.denominazione ?? [c.nome, c.cognome].filter(Boolean).join(" ") ?? "Senza nome",
          indirizzo: c.indirizzo,
          citta: c.comune,
          identificativo: c.partitaIva ? `P.IVA ${c.partitaIva}` : c.codiceFiscale ? `C.F. ${c.codiceFiscale}` : null,
          completo: Boolean(
            (c.partitaIva || c.codiceFiscale) && c.indirizzo && c.cap && c.comune &&
            /^[A-Z0-9]{7}$/.test(c.codiceDestinatario.toUpperCase())
          ),
        }))}
        fattureStornabili={fatture
          .filter((f) => f.tipoDocumento === "TD01" && f.stato !== "annullata")
          .map((f) => ({ id: f.id, etichetta: `${numeroFattura(f)} — ${f.dataEmissione}` }))}
      />
    </div>
  );
}
