import { richiediUtente } from "@/lib/auth";
import { leggiFornitori } from "@/lib/data/fornitori";
import { leggiSpese } from "@/lib/data/spese";
import { spesePerFornitore } from "@/lib/domain/report";
import { formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Metrica, Pillola, Scheda, Vuoto } from "@/components/Pagina";
import { NuovoFornitoreForm } from "./NuovoFornitoreForm";
import { cambiaAttivazione, rimuoviFornitore } from "./actions";

export const metadata = { title: "Fornitori — GAR Studio" };

export default async function PaginaFornitori() {
  const { supabase, user } = await richiediUtente();
  const [fornitori, spese] = await Promise.all([
    leggiFornitori(supabase, user.id),
    leggiSpese(supabase, user.id),
  ]);

  const anno = new Date().getFullYear();
  const periodo = { da: `${anno}-01-01`, a: `${anno}-12-31`, etichetta: `Anno ${anno}` };
  const nomi = new Map(fornitori.map((f) => [f.id, f.denominazione]));
  const perFornitore = new Map(
    spesePerFornitore(spese, periodo, nomi).map((voce) => [voce.chiave, voce])
  );

  const totaleTracciato = [...perFornitore.values()].reduce((somma, v) => somma + v.totale, 0);
  const speseAnno = spese.filter((s) => s.data >= periodo.da && s.data <= periodo.a);
  const senzaFornitore = speseAnno
    .filter((s) => !s.fornitoreId)
    .reduce((somma, s) => somma + s.importo, 0);

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Fornitori"
        descrizione="Chi ti fattura. Collegare una spesa a una scheda è facoltativo, ma è ciò che rende sommabile «quanto spendo per questo servizio»."
      />

      {fornitori.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Metrica
            etichetta={`Speso tracciato ${anno}`}
            valore={formattaEuro(totaleTracciato)}
            accento
            nota={`su ${fornitori.length} ${fornitori.length === 1 ? "scheda" : "schede"}`}
          />
          <Metrica
            etichetta="Spese senza fornitore"
            valore={formattaEuro(senzaFornitore)}
            nota={senzaFornitore > 0 ? "non entrano in questa classifica" : "tutto collegato"}
          />
          <Metrica
            etichetta="Totale spese anno"
            valore={formattaEuro(totaleTracciato + senzaFornitore)}
          />
        </div>
      )}

      <NuovoFornitoreForm />

      {fornitori.length === 0 ? (
        <Scheda>
          <Vuoto messaggio="Nessun fornitore in anagrafica. Aggiungi quelli che ti fatturano più di una volta: hosting, software, commercialista." />
        </Scheda>
      ) : (
        <Scheda titolo={`Speso nel ${anno}`}>
          <div className="divide-y divide-line">
            {fornitori.map((fornitore) => {
              const voce = perFornitore.get(fornitore.id);
              return (
                <div
                  key={fornitore.id}
                  className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 riga-interattiva"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{fornitore.denominazione}</span>
                      {!fornitore.attivo && <Pillola>Non più usato</Pillola>}
                      {fornitore.categoriaPredefinita && (
                        <Pillola tono="accento">{fornitore.categoriaPredefinita}</Pillola>
                      )}
                    </div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {[fornitore.partitaIva && `P.IVA ${fornitore.partitaIva}`, fornitore.email]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm tabular-nums font-medium">
                      {voce ? formattaEuro(voce.totale) : "—"}
                    </div>
                    <div className="text-xs text-ink-faint">
                      {voce
                        ? `${voce.conteggio} ${voce.conteggio === 1 ? "spesa" : "spese"} · ${voce.quota}%`
                        : "nessuna spesa quest'anno"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <form action={cambiaAttivazione}>
                      <input type="hidden" name="id" value={fornitore.id} />
                      <input type="hidden" name="attivo" value={fornitore.attivo ? "0" : "1"} />
                      <button type="submit" className="text-xs text-ink-muted hover:text-ink transition">
                        {fornitore.attivo ? "Archivia" : "Riattiva"}
                      </button>
                    </form>
                    {!voce && (
                      <form action={rimuoviFornitore}>
                        <input type="hidden" name="id" value={fornitore.id} />
                        <button type="submit" className="text-xs text-danger hover:underline">
                          Elimina
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 sm:px-5 py-3 border-t border-line text-xs text-ink-faint">
            «Archivia» toglie il fornitore dai menu senza toccare le spese passate. L&apos;eliminazione
            compare solo per le schede che non hanno spese collegate quest&apos;anno.
          </div>
        </Scheda>
      )}
    </div>
  );
}
