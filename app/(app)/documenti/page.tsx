import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiAllegati } from "@/lib/data/allegati";
import { leggiFatture } from "@/lib/data/fatture";
import { leggiSpese } from "@/lib/data/spese";
import { leggiClienti } from "@/lib/data/clienti";
import { numeroFattura } from "@/lib/domain/fattura";
import { nomeCliente } from "@/lib/domain/cliente";
import { formattaData } from "@/lib/ui/format";
import { CaricaDocumentoForm } from "./CaricaDocumentoForm";
import { rimuoviDocumento } from "./actions";
import { IntestazionePagina, Vuoto } from "@/components/Pagina";

export default async function PaginaDocumenti() {
  const { supabase, user } = await richiediUtente();

  const [allegati, fatture, spese, clienti] = await Promise.all([
    leggiAllegati(supabase, user.id),
    leggiFatture(supabase, user.id),
    leggiSpese(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);

  const nomiClienti = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const etichetteFatture = new Map(
    fatture.map((f) => [f.id, `${numeroFattura(f)} · ${nomiClienti.get(f.clienteId) ?? "—"}`])
  );
  const etichetteSpese = new Map(spese.map((s) => [s.id, `${formattaData(s.data)} · ${s.descrizione}`]));

  return (
    <div className="flex flex-col gap-8">
      <IntestazionePagina
        titolo="Documenti"
        descrizione="Ricevute, contratti, quietanze F24, Certificazioni Uniche. I documenti fiscali vanno conservati per otto anni: tenerli qui significa non doverli cercare tra le mail quando servono, che è sempre il momento in cui c'è meno tempo."
      />

      <CaricaDocumentoForm
        fatture={fatture.map((f) => ({ valore: f.id, etichetta: etichetteFatture.get(f.id) ?? numeroFattura(f) }))}
        spese={spese.map((s) => ({ valore: s.id, etichetta: etichetteSpese.get(s.id) ?? s.descrizione }))}
      />

      {allegati.length === 0 ? (
        <div className="scheda">
          <Vuoto messaggio="Nessun documento in archivio: carica il primo qui sopra." />
        </div>
      ) : (
        <div className="scheda overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line text-xs text-ink-muted uppercase tracking-wide">
            {allegati.length === 1 ? "1 documento" : `${allegati.length} documenti`}
          </div>
          <ul className="divide-y divide-line">
            {allegati.map((allegato) => {
              const collegato = allegato.fatturaId
                ? { href: `/fatture/${allegato.fatturaId}`, testo: etichetteFatture.get(allegato.fatturaId) }
                : allegato.spesaId
                  ? { href: "/spese", testo: etichetteSpese.get(allegato.spesaId) }
                  : null;

              return (
                <li key={allegato.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 text-sm riga-interattiva">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/allegati/${allegato.id}`}
                      className="font-medium hover:text-accent transition break-all"
                    >
                      {allegato.nomeFile}
                    </a>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {formattaData(allegato.caricatoIl.slice(0, 10))}
                      {allegato.dimensioneByte !== null && ` · ${dimensioneLeggibile(allegato.dimensioneByte)}`}
                      {allegato.descrizione && ` · ${allegato.descrizione}`}
                    </div>
                    {collegato?.testo && (
                      <div className="text-xs mt-1">
                        <Link href={collegato.href} className="text-accent hover:underline">
                          {collegato.testo}
                        </Link>
                      </div>
                    )}
                  </div>
                  <form action={rimuoviDocumento} className="shrink-0">
                    <input type="hidden" name="id" value={allegato.id} />
                    <button type="submit" className="text-xs text-danger hover:underline">
                      elimina
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-ink-faint">
        I file stanno in uno spazio privato: si aprono attraverso un collegamento firmato che scade dopo un minuto,
        così un indirizzo finito nella cronologia del browser non resta valido.
      </p>
    </div>
  );
}

function dimensioneLeggibile(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}
