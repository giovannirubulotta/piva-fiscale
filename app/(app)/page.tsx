import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiFatture, leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiClienti } from "@/lib/data/clienti";
import { numeroFattura } from "@/lib/domain/fattura";
import { fasceDiRitardo, posizioniAperte, totaleAperto, totaleScaduto } from "@/lib/domain/pagamenti";
import { AndamentoFatturato, serieAnno } from "@/components/AndamentoFatturato";
import { PrevisioneAnno } from "@/components/PrevisioneAnno";
import { calcolaPrevisione } from "@/lib/domain/previsione";
import { segnaIncassata } from "./fatture/actions";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { leggiRequisitiForfettario } from "@/lib/data/requisitiForfettario";
import { contaErroriRecenti } from "@/lib/data/logErrori";
import { calcolaRiepilogoAnno, aliquoteAnno, fatturatoIncassatoAnno } from "@/lib/domain/calcolo";
import { riepilogoOperativo } from "@/lib/domain/report";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali, generaScadenzeBollo } from "@/lib/domain/scadenzario";
import { valutaRequisitiForfettario, valutaSoglieForfettario } from "@/lib/domain/requisitiForfettario";
import type { EsitoRequisito } from "@/lib/domain/types";
import { formattaEuro, formattaData, giorniMancanti } from "@/lib/ui/format";
import { nomeCliente } from "@/lib/domain/cliente";
import { IntestazionePagina, Metrica, TitoloSezione, Vuoto } from "@/components/Pagina";

export default async function Dashboard() {
  const { supabase, user } = await richiediUtente();
  const profilo = await leggiProfilo(supabase, user.id);

  if (!profilo || !profilo.dataApertura) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Benvenuto</h1>
        <p className="text-sm text-ink-muted mb-6">
          Prima di vedere calcoli e scadenze, completa il profilo fiscale: data di apertura della P.IVA,
          coefficiente di redditività e aliquota applicabile.
        </p>
        <Link
          href="/impostazioni"
          className="inline-block rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition"
        >
          Completa il profilo
        </Link>
      </div>
    );
  }

  const [tutteLeAliquote, incassi, statiScadenze, requisiti, fatture, clienti] = await Promise.all([
    leggiAliquote(supabase),
    leggiIncassiDaFatture(supabase, user.id),
    leggiStatiScadenze(supabase, user.id),
    leggiRequisitiForfettario(supabase, user.id, new Date().getFullYear()),
    leggiFatture(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);
  const erroriRecenti = await contaErroriRecenti(supabase, user.id);

  const annoCorrente = new Date().getFullYear();
  const aliquoteCorrente = aliquoteAnno(tutteLeAliquote, annoCorrente);

  if (!aliquoteCorrente) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Aliquote mancanti</h1>
        <p className="text-sm text-ink-muted mb-6">
          Non ci sono ancora aliquote fiscali configurate. Aggiungile in Impostazioni per iniziare a vedere i calcoli.
        </p>
        <Link
          href="/impostazioni"
          className="inline-block rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition"
        >
          Vai a Impostazioni
        </Link>
      </div>
    );
  }

  const riepilogoCorrente = calcolaRiepilogoAnno(annoCorrente, incassi, profilo, aliquoteCorrente);
  const previsione = calcolaPrevisione(annoCorrente, incassi, fatture, profilo, aliquoteCorrente, new Date());
  const chiusi = riepiloghiAnniChiusi(incassi, profilo, tutteLeAliquote, annoCorrente);
  const scadenzeAnnuali = generaScadenzeAnnuali(chiusi);
  const scadenzeBollo = generaScadenzeBollo(incassi, annoCorrente - 1).concat(generaScadenzeBollo(incassi, annoCorrente));

  const oggi = new Date().toISOString().slice(0, 10);
  const scadenzeNonPagate = scadenzeAnnuali
    .filter((s) => !statiScadenze.get(s.chiave)?.pagato)
    .sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
  const prossimaScadenza = scadenzeNonPagate[0] ?? null;
  const scadenzeInRitardo = scadenzeNonPagate.filter((s) => s.dataScadenza < oggi);

  const bolloDaVersare = scadenzeBollo.reduce((sum, s) => sum + s.importoDovuto, 0);

  const esitoRequisiti = valutaRequisitiForfettario(requisiti);
  const soglia = valutaSoglieForfettario(fatturatoIncassatoAnno(incassi, annoCorrente));

  const nomiClienti = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const posizioni = posizioniAperte(fatture, new Date());
  const fasce = fasceDiRitardo(posizioni);
  const aperto = totaleAperto(posizioni);
  const scaduto = totaleScaduto(posizioni);

  const operativo = riepilogoOperativo(fatture, {
    da: `${annoCorrente}-01-01`,
    a: `${annoCorrente}-12-31`,
    etichetta: `Anno ${annoCorrente}`,
  });

  return (
    <div className="flex flex-col gap-8">
      <IntestazionePagina
        titolo={`Anno ${annoCorrente}`}
        descrizione={
          profilo.agevolazione5Percento === null
            ? "Aliquota 15% applicata per prudenza — il diritto al 5% non è ancora stato verificato."
            : profilo.agevolazione5Percento
              ? "Aliquota agevolata 5% confermata."
              : "Aliquota standard 15%."
        }
      />

      {scadenzeInRitardo.length > 0 && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-4">
          <p className="text-sm text-danger font-medium">
            {scadenzeInRitardo.length === 1 ? "C'è una scadenza scaduta e non segnata come pagata." : `Ci sono ${scadenzeInRitardo.length} scadenze scadute e non segnate come pagate.`}
          </p>
          <Link href="/scadenze" className="text-sm text-danger underline mt-1 inline-block">
            Vai allo scadenzario
          </Link>
        </div>
      )}

      {erroriRecenti > 0 && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 px-5 py-4">
          <p className="text-sm text-warn font-medium">
            {erroriRecenti === 1
              ? "Nelle ultime 24 ore l'applicazione ha incontrato un errore."
              : `Nelle ultime 24 ore l'applicazione ha incontrato ${erroriRecenti} errori.`}
          </p>
          <Link href="/diagnostica" className="text-sm text-warn underline mt-1 inline-block">
            Vedi la diagnostica
          </Link>
        </div>
      )}

      {esitoRequisiti.esitoGlobale === "escluso" && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-4">
          <p className="text-sm text-danger font-medium">
            Hai dichiarato una causa di esclusione dal regime forfettario: verifica con un commercialista come
            procedere.
          </p>
          <Link href="/requisiti" className="text-sm text-danger underline mt-1 inline-block">
            Vai a Requisiti regime
          </Link>
        </div>
      )}

      {/* I tre numeri del mestiere, prima di qualunque calcolo fiscale.
          Emesso è quanto hai lavorato, incassato è quanto hai preso, il terzo è
          la differenza — cioè i soldi che sono usciti dal tuo tempo e non sono
          ancora entrati in banca. Sono la prima riga perché sono la prima cosa
          che si vuole sapere aprendo l'applicazione. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metrica
          etichetta={`Fatturato emesso ${annoCorrente}`}
          valore={formattaEuro(operativo.emesso)}
          nota={
            operativo.numeroFatture === 1
              ? "1 fattura emessa quest'anno"
              : `${operativo.numeroFatture} fatture emesse quest'anno`
          }
        />
        <Metrica
          etichetta={`Incassato ${annoCorrente}`}
          valore={formattaEuro(operativo.incassato)}
          stato="ok"
          nota="Solo questo conta per le tasse: il forfettario tassa per cassa."
        />
        <Metrica
          etichetta="Ancora da incassare"
          valore={formattaEuro(operativo.daIncassare)}
          stato={scaduto > 0 ? "danger" : operativo.daIncassare > 0 ? "warn" : undefined}
          nota={
            scaduto > 0
              ? `di cui ${formattaEuro(scaduto)} già oltre la scadenza`
              : operativo.daIncassare > 0
                ? "nulla in ritardo, per ora"
                : "tutto incassato"
          }
        />
      </div>

      <PrevisioneAnno previsione={previsione} />

      <div>
        <TitoloSezione collegamento={{ href: "/quadro-lm", testo: "Quadro LM" }}>
          Da accantonare sull&apos;incassato
        </TitoloSezione>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metrica etichetta="Imponibile stimato" valore={formattaEuro(riepilogoCorrente.imponibile)} />
          <Metrica
            etichetta="Contributi INPS stimati"
            valore={formattaEuro(riepilogoCorrente.contributiInps)}
          />
          <Metrica
            etichetta={`Imposta sostitutiva (${(riepilogoCorrente.aliquotaSostitutivaApplicata * 100).toFixed(0)}%)`}
            valore={formattaEuro(riepilogoCorrente.impostaSostitutiva)}
            nota="Al netto dei contributi, come vuole l'art. 1 c. 64 L. 190/2014."
          />
          <Metrica
            etichetta="Totale da mettere da parte"
            valore={formattaEuro(riepilogoCorrente.totaleDovuto)}
            accento
            nota={`Restano ${formattaEuro(riepilogoCorrente.nettoStimato)}`}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="scheda p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">Prossima scadenza</div>
          {prossimaScadenza ? (
            <>
              <div className="text-lg font-medium">{prossimaScadenza.descrizione}</div>
              <div className="text-sm text-ink-muted mt-1">
                {formattaData(prossimaScadenza.dataScadenza)} · {formattaEuro(prossimaScadenza.importo)}
              </div>
              <div className="text-sm mt-2">
                {giorniMancanti(prossimaScadenza.dataScadenza) >= 0
                  ? `tra ${giorniMancanti(prossimaScadenza.dataScadenza)} giorni`
                  : `${Math.abs(giorniMancanti(prossimaScadenza.dataScadenza))} giorni di ritardo`}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {riepilogoCorrente.primoAnno
                ? "Primo anno di attività: nessuna scadenza dovuta finché l'anno non si chiude."
                : "Nessuna scadenza in sospeso al momento."}
            </p>
          )}
          <Link href="/scadenze" className="text-sm text-accent hover:underline mt-3 inline-block">
            Vedi tutto lo scadenzario →
          </Link>
        </div>

        <div className="scheda p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">Bollo virtuale da versare</div>
          <div className="text-lg font-medium">{formattaEuro(bolloDaVersare)}</div>
          <p className="text-sm text-ink-muted mt-1">
            Su fatture senza IVA sopra 77,47 €, cumulato sugli ultimi due trimestri tracciati.
          </p>
        </div>

        <div className="scheda p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">Requisiti regime forfettario</div>
          <div className={`text-lg font-medium ${TESTO_ESITO[esitoRequisiti.esitoGlobale]}`}>
            {TITOLO_ESITO[esitoRequisiti.esitoGlobale]}
          </div>
          <p className="text-sm text-ink-muted mt-1">{soglia.messaggio}</p>
          <Link href="/requisiti" className="text-sm text-accent hover:underline mt-2 inline-block">
            Vai a Requisiti regime →
          </Link>
        </div>
      </div>

      <div>
        <TitoloSezione collegamento={{ href: "/fatture", testo: "Tutte le fatture" }}>
          Fatture da incassare
        </TitoloSezione>
        {posizioni.length === 0 ? (
          <div className="scheda">
            <Vuoto
              messaggio="Nessuna fattura in attesa di incasso."
              azione={{ href: "/fatture/nuova", testo: "Emetti una fattura" }}
            />
          </div>
        ) : (
          <div className="scheda overflow-hidden">
            <div
              className={`px-4 sm:px-5 py-3 border-b border-line text-sm ${
                scaduto > 0 ? "bg-danger/10 text-danger" : "bg-accent-soft/40 text-accent"
              }`}
            >
              {scaduto > 0
                ? `${formattaEuro(scaduto)} scaduti su ${formattaEuro(aperto)} da incassare`
                : `${formattaEuro(aperto)} da incassare, nulla in ritardo`}
            </div>

            {/* Le fasce di anzianità stanno sopra l'elenco: oltre i 60 giorni un
                credito cambia natura, e questa riga è ciò che lo rende visibile
                senza dover leggere data per data. */}
            {fasce.length > 1 && (
              <div className="px-4 sm:px-5 py-2.5 border-b border-line flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                {fasce.map((f) => (
                  <span key={f.chiave}>
                    {f.etichetta} <span className="tabular-nums text-ink">{formattaEuro(f.totale)}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="divide-y divide-line">
              {posizioni.slice(0, 5).map(({ fattura, stato, giorniDiRitardo, dataScadenza, importo }) => (
                <div
                  key={fattura.id}
                  className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm riga-interattiva"
                >
                  <Link href={`/fatture/${fattura.id}`} className="min-w-0 flex-1 hover:text-accent transition">
                    <div className="font-medium truncate">{nomiClienti.get(fattura.clienteId) ?? "—"}</div>
                    <div className="text-xs">
                      <span className="text-ink-faint">{numeroFattura(fattura)} · </span>
                      <span className={stato === "scaduta" ? "text-danger" : stato === "in_scadenza" ? "text-warn" : "text-ink-faint"}>
                        {stato === "scaduta"
                          ? `in ritardo di ${giorniDiRitardo} ${giorniDiRitardo === 1 ? "giorno" : "giorni"}`
                          : `scade il ${formattaData(dataScadenza)}`}
                      </span>
                    </div>
                  </Link>
                  <div className="tabular-nums shrink-0">{formattaEuro(importo)}</div>
                  <form action={segnaIncassata} className="shrink-0">
                    <input type="hidden" name="id" value={fattura.id} />
                    <button type="submit" className="btn-primario text-xs px-3 py-1.5">
                      Incassa
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AndamentoFatturato serie={[serieAnno(incassi, annoCorrente), serieAnno(incassi, annoCorrente - 1)]} />

      {/* La striscia in fondo, come nel gestionale di riferimento — ma con
          numeri che rispondono a una domanda invece di tre voci accostate.
          La fattura media è il dato che dice se conviene alzare i prezzi o
          prendere più lavori. */}
      {operativo.numeroFatture > 0 && (
        <div className="scheda px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <span className="text-ink-muted">
            Fattura media <span className="text-ink font-medium tabular-nums">{formattaEuro(operativo.fatturaMedia)}</span>
          </span>
          <span className="text-ink-muted">
            Documenti emessi <span className="text-ink font-medium tabular-nums">{operativo.numeroFatture}</span>
            {operativo.numeroNoteCredito > 0 && (
              <span className="text-ink-faint">
                {" "}
                + {operativo.numeroNoteCredito} {operativo.numeroNoteCredito === 1 ? "nota" : "note"} di credito
              </span>
            )}
          </span>
          <Link href="/report" className="text-accent hover:underline ml-auto">
            Report completo →
          </Link>
        </div>
      )}
    </div>
  );
}

const TITOLO_ESITO: Record<EsitoRequisito, string> = {
  ok: "Nessuna causa dichiarata",
  da_verificare: "Da verificare",
  escluso: "Causa di esclusione dichiarata",
};

const TESTO_ESITO: Record<EsitoRequisito, string> = {
  ok: "text-ok",
  da_verificare: "text-warn",
  escluso: "text-danger",
};


