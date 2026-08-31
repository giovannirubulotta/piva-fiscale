import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiEventi } from "@/lib/data/eventi";
import { leggiFatture, leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiPreventivi } from "@/lib/data/preventivi";
import { leggiRicorrenti } from "@/lib/data/ricorrenti";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiAttivita } from "@/lib/data/crm";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { nomeCliente } from "@/lib/domain/cliente";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali } from "@/lib/domain/scadenzario";
import {
  ETICHETTE_ORIGINE,
  agenda,
  grigliaMese,
  vociCalendario,
  vociDelGiorno,
  type OrigineVoce,
  type TonoVoce,
  type VoceCalendario,
} from "@/lib/domain/calendario";
import { formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Scheda, Vuoto } from "@/components/Pagina";
import { NuovoEventoForm } from "./NuovoEventoForm";
import { rimuoviEvento } from "./actions";

export const metadata = { title: "Calendario — GAR Studio" };

const NOMI_MESE = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** Il colore di una voce. Le sei sorgenti si distinguono, ma non gridano tutte. */
const PUNTO: Record<TonoVoce, string> = {
  neutro: "bg-ink-faint",
  accento: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
};

const TESTO: Record<TonoVoce, string> = {
  neutro: "text-ink-muted",
  accento: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
};

export default async function PaginaCalendario({ searchParams }: PageProps<"/calendario">) {
  const parametri = await searchParams;
  const { supabase, user } = await richiediUtente();

  const [eventi, fatture, preventivi, ricorrenti, clienti, attivita, profilo, aliquote, incassi, statiScadenze] =
    await Promise.all([
      leggiEventi(supabase, user.id),
      leggiFatture(supabase, user.id),
      leggiPreventivi(supabase, user.id),
      leggiRicorrenti(supabase, user.id),
      leggiClienti(supabase, user.id),
      leggiAttivita(supabase, user.id),
      leggiProfilo(supabase, user.id),
      leggiAliquote(supabase),
      leggiIncassiDaFatture(supabase, user.id),
      leggiStatiScadenze(supabase, user.id),
    ]);

  const oggi = new Date().toISOString().slice(0, 10);
  const annoCorrente = Number(oggi.slice(0, 4));

  const scadenzeFiscali = profilo
    ? generaScadenzeAnnuali(riepiloghiAnniChiusi(incassi, profilo, aliquote, annoCorrente))
    : [];
  const scadenzePagate = new Set(
    [...statiScadenze.entries()].filter(([, stato]) => stato.pagato).map(([chiave]) => chiave)
  );

  const voci = vociCalendario(
    {
      eventi,
      scadenzeFiscali,
      scadenzePagate,
      fatture,
      preventivi,
      ricorrenti,
      attivita,
      nomiClienti: new Map(clienti.map((c) => [c.id, nomeCliente(c)])),
    },
    oggi
  );

  // Il mese e il giorno vivono nell'indirizzo: tornando indietro col browser
  // si torna al mese di prima, e un link a un giorno preciso si può salvare.
  const meseParam = typeof parametri.mese === "string" ? parametri.mese : null;
  const valido = meseParam !== null && /^\d{4}-\d{2}$/.test(meseParam);
  const [anno, mese] = valido
    ? meseParam.split("-").map(Number)
    : [annoCorrente, Number(oggi.slice(5, 7))];

  const giornoParam = typeof parametri.giorno === "string" ? parametri.giorno : null;
  const giornoScelto = giornoParam && /^\d{4}-\d{2}-\d{2}$/.test(giornoParam) ? giornoParam : oggi;

  const griglia = grigliaMese(anno, mese, voci, oggi);
  const riepilogo = agenda(voci, oggi);
  const delGiorno = vociDelGiorno(voci, giornoScelto);

  const precedente = mese === 1 ? `${anno - 1}-12` : `${anno}-${String(mese - 1).padStart(2, "0")}`;
  const successivo = mese === 12 ? `${anno + 1}-01` : `${anno}-${String(mese + 1).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Calendario"
        descrizione="Tutto quello che ha una data: agenda, scadenze fiscali, incassi attesi, canoni, preventivi in scadenza e prossimi passi delle trattative."
        azioni={
          <a href="/api/calendario" className="btn-secondario" download>
            Scarica .ics
          </a>
        }
      />

      {riepilogo.inRitardo.length > 0 && (
        <Scheda titolo={`In ritardo — ${riepilogo.inRitardo.length}`}>
          <ElencoVoci voci={riepilogo.inRitardo} conData />
        </Scheda>
      )}

      <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
        <Scheda>
          <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {NOMI_MESE[mese - 1]} <span className="text-ink-muted font-normal">{anno}</span>
            </h2>
            <div className="flex items-center gap-1">
              <Link
                href={`/calendario?mese=${precedente}`}
                aria-label="Mese precedente"
                className="rounded-lg border border-line px-2.5 py-1 text-sm text-ink-muted hover:text-ink hover:border-ink-faint transition"
              >
                ←
              </Link>
              <Link
                href="/calendario"
                className="rounded-lg border border-line px-3 py-1 text-sm text-ink-muted hover:text-ink hover:border-ink-faint transition"
              >
                Oggi
              </Link>
              <Link
                href={`/calendario?mese=${successivo}`}
                aria-label="Mese successivo"
                className="rounded-lg border border-line px-2.5 py-1 text-sm text-ink-muted hover:text-ink hover:border-ink-faint transition"
              >
                →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-line">
            {GIORNI_SETTIMANA.map((giorno) => (
              <div key={giorno} className="px-2 py-2 text-center etichetta-cifra">
                {giorno}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {griglia.map((giorno) => {
              const scelto = giorno.data === giornoScelto;
              return (
                <Link
                  key={giorno.data}
                  href={`/calendario?mese=${anno}-${String(mese).padStart(2, "0")}&giorno=${giorno.data}`}
                  aria-current={scelto ? "date" : undefined}
                  className={`min-h-[4.5rem] border-r border-b border-line last-in-row:border-r-0 p-1.5 flex flex-col gap-1 transition ${
                    giorno.nelMese ? "" : "bg-surface-2/50"
                  } ${scelto ? "bg-accent-soft" : "hover:bg-surface-2"}`}
                >
                  <span
                    className={`text-xs tabular-nums self-start rounded px-1 ${
                      giorno.oggi
                        ? "bg-accent text-white font-semibold"
                        : giorno.nelMese
                          ? "text-ink"
                          : "text-ink-faint"
                    }`}
                  >
                    {Number(giorno.data.slice(8, 10))}
                  </span>

                  {/* I pallini invece dei titoli: in una casella di 60px un
                      titolo si tronca a tre lettere e non dice niente, mentre
                      la densità di pallini si legge a colpo d'occhio. Il
                      dettaglio sta nel pannello a fianco. */}
                  <span className="flex flex-wrap gap-0.5 content-start">
                    {giorno.voci.slice(0, 6).map((voce) => (
                      <span
                        key={voce.chiave}
                        className={`size-1.5 rounded-full ${PUNTO[voce.tono]}`}
                        aria-hidden="true"
                      />
                    ))}
                    {giorno.voci.length > 6 && (
                      <span className="text-[0.625rem] leading-none text-ink-faint">
                        +{giorno.voci.length - 6}
                      </span>
                    )}
                  </span>

                  <span className="sr-only">
                    {giorno.voci.length === 0
                      ? "nessun impegno"
                      : `${giorno.voci.length} ${giorno.voci.length === 1 ? "voce" : "voci"}`}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-line flex flex-wrap gap-x-4 gap-y-1.5">
            {(Object.keys(ETICHETTE_ORIGINE) as OrigineVoce[]).map((origine) => (
              <span key={origine} className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span className={`size-1.5 rounded-full ${PUNTO[TONO_LEGENDA[origine]]}`} aria-hidden="true" />
                {ETICHETTE_ORIGINE[origine]}
              </span>
            ))}
          </div>
        </Scheda>

        <div className="flex flex-col gap-6">
          <Scheda
            titolo={
              giornoScelto === oggi
                ? "Oggi"
                : new Date(`${giornoScelto}T00:00:00Z`).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  })
            }
          >
            {delGiorno.length === 0 ? (
              <Vuoto messaggio="Niente in programma." />
            ) : (
              <ElencoVoci voci={delGiorno} />
            )}
          </Scheda>

          {riepilogo.prossimiSette.length > 0 && (
            <Scheda titolo="Prossimi sette giorni">
              <ElencoVoci voci={riepilogo.prossimiSette} conData />
            </Scheda>
          )}
        </div>
      </div>

      <NuovoEventoForm
        clienti={clienti.map((c) => ({ id: c.id, nome: nomeCliente(c) }))}
        dataPredefinita={giornoScelto}
      />

      <p className="text-xs text-ink-faint max-w-[70ch]">
        Solo gli eventi che scrivi tu sono memorizzati. Scadenze fiscali, incassi attesi, canoni e
        preventivi in scadenza sono <strong>derivati</strong> dai dati che già esistono: cambi la
        data di una fattura e il calendario è già aggiornato, senza nessuna sincronizzazione. Per la
        stessa ragione una voce derivata non si sposta da qui — si cambia il dato che la genera.
      </p>
    </div>
  );
}

/** Il colore che rappresenta ciascuna sorgente nella legenda. */
const TONO_LEGENDA: Record<OrigineVoce, TonoVoce> = {
  evento: "accento",
  scadenza_fiscale: "warn",
  fattura: "danger",
  ricorrente: "warn",
  preventivo: "accento",
  attivita: "accento",
};

function ElencoVoci({ voci, conData = false }: { voci: VoceCalendario[]; conData?: boolean }) {
  return (
    <div className="divide-y divide-line">
      {voci.map((voce) => {
        const contenuto = (
          <>
            <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${PUNTO[voce.tono]}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-snug">{voce.titolo}</span>
              <span className="block text-xs text-ink-faint mt-0.5">
                {[
                  conData &&
                    new Date(`${voce.data}T00:00:00Z`).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    }),
                  voce.ora,
                  voce.dettaglio,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            {voce.importo !== null && (
              <span className={`text-sm tabular-nums shrink-0 ${TESTO[voce.tono]}`}>
                {formattaEuro(voce.importo)}
              </span>
            )}
          </>
        );

        return (
          <div key={voce.chiave} className="px-4 sm:px-5 py-2.5 flex items-start gap-2.5 riga-interattiva">
            {voce.href ? (
              <Link href={voce.href} className="flex items-start gap-2.5 flex-1 min-w-0 hover:text-accent transition">
                {contenuto}
              </Link>
            ) : (
              <span className="flex items-start gap-2.5 flex-1 min-w-0">{contenuto}</span>
            )}
            {voce.modificabile && (
              <form action={rimuoviEvento} className="shrink-0">
                <input type="hidden" name="id" value={voce.chiave.replace("evento:", "")} />
                <button type="submit" className="text-xs text-ink-faint hover:text-danger transition">
                  togli
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
