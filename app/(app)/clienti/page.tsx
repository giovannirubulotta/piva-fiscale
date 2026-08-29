import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { formattaData } from "@/lib/ui/format";
import type { Cliente } from "@/lib/domain/types";
import { ETICHETTA_TIPOLOGIA_CLIENTE } from "./ClienteForm";
import { RicercaClienti } from "./RicercaClienti";

export default async function PaginaClienti({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const { errore } = await searchParams;
  const { supabase, user } = await richiediUtente();
  const [clienti, fatture] = await Promise.all([
    leggiClienti(supabase, user.id),
    leggiFatture(supabase, user.id),
  ]);

  const ultimaFattura = new Map<string, string>();
  for (const fattura of fatture) {
    const precedente = ultimaFattura.get(fattura.clienteId);
    if (!precedente || fattura.dataEmissione > precedente) {
      ultimaFattura.set(fattura.clienteId, fattura.dataEmissione);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold mb-1">Clienti</h1>
          <p className="text-sm text-ink-muted">
            {clienti.length === 0
              ? "Nessun cliente ancora: il primo serve per poter emettere una fattura."
              : `${clienti.length} ${clienti.length === 1 ? "cliente" : "clienti"} in anagrafica.`}
          </p>
        </div>
        <Link href="/clienti/nuovo" className="btn-primario shrink-0">
          Nuovo cliente
        </Link>
      </div>

      {errore === "cliente-con-fatture" && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Questo cliente ha già delle fatture intestate e non può essere eliminato: cancellarlo lascerebbe documenti
          senza intestatario. Puoi modificarne i dati, oppure eliminare prima le fatture collegate.
        </div>
      )}

      {clienti.length > 0 && (
        <RicercaClienti
          clienti={clienti.map((c) => ({
            id: c.id,
            nome: nomeVisualizzato(c),
            tipologia: ETICHETTA_TIPOLOGIA_CLIENTE[c.tipologia],
            identificativo: c.partitaIva ?? c.codiceFiscale ?? null,
            email: c.email,
            telefono: c.telefono,
            citta: c.comune,
            ultimaFattura: ultimaFattura.get(c.id) ? formattaData(ultimaFattura.get(c.id)!) : null,
            completo: completoPerXml(c),
          }))}
        />
      )}
    </div>
  );
}

export function nomeVisualizzato(cliente: Cliente): string {
  if (cliente.denominazione) return cliente.denominazione;
  return [cliente.nome, cliente.cognome].filter(Boolean).join(" ") || "Senza nome";
}

/** Un cliente è pronto per la fattura elettronica solo se ha tutti i campi che l'XML richiede. */
function completoPerXml(cliente: Cliente): boolean {
  const haIdentificativo = Boolean(cliente.partitaIva || cliente.codiceFiscale);
  const haSede = Boolean(cliente.indirizzo && cliente.cap && cliente.comune);
  const haCodice = /^[A-Z0-9]{7}$/.test(cliente.codiceDestinatario.toUpperCase());
  return haIdentificativo && haSede && haCodice;
}
