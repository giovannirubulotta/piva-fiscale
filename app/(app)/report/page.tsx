import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiFatture } from "@/lib/data/fatture";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiSpese } from "@/lib/data/spese";
import { leggiFornitori } from "@/lib/data/fornitori";
import { nomeCliente } from "@/lib/domain/cliente";
import {
  fatturatoPerCliente,
  periodiPredefiniti,
  riepilogoOperativo,
  spesePerCategoria,
  spesePerFornitore,
  type Periodo,
  type VoceClassifica,
} from "@/lib/domain/report";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Metrica, Scheda, Vuoto } from "@/components/Pagina";

export const metadata = { title: "Report — GAR Studio" };

/**
 * Il periodo si sceglie con un collegamento, non con un menu a tendina in
 * JavaScript: la scelta finisce nell'indirizzo, quindi si può salvare tra i
 * preferiti, condividere e ricaricare senza perderla. Un filtro che vive solo
 * nello stato del componente è un filtro che si azzera a ogni ricarica.
 */
export default async function PaginaReport({ searchParams }: PageProps<"/report">) {
  const parametri = await searchParams;
  const { supabase, user } = await richiediUtente();

  const [fatture, clienti, spese, fornitori] = await Promise.all([
    leggiFatture(supabase, user.id),
    leggiClienti(supabase, user.id),
    leggiSpese(supabase, user.id),
    leggiFornitori(supabase, user.id),
  ]);

  const oggi = new Date().toISOString().slice(0, 10);
  const predefiniti = periodiPredefiniti(oggi);
  const da = typeof parametri.da === "string" ? parametri.da : null;
  const a = typeof parametri.a === "string" ? parametri.a : null;

  const periodo: Periodo =
    da && a
      ? { da, a, etichetta: `${formattaData(da)} – ${formattaData(a)}` }
      : (predefiniti.find((p) => p.etichetta.startsWith("Anno")) as Periodo);

  const nomiClienti = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const nomiFornitori = new Map(fornitori.map((f) => [f.id, f.denominazione]));

  const operativo = riepilogoOperativo(fatture, periodo);
  const perCliente = fatturatoPerCliente(fatture, periodo, nomiClienti);
  const perCategoria = spesePerCategoria(spese, periodo);
  const perFornitore = spesePerFornitore(spese, periodo, nomiFornitori);
  const totaleSpese = perCategoria.reduce((somma, v) => somma + v.totale, 0);

  const concentrazione = perCliente[0]?.quota ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Report"
        descrizione={periodo.etichetta}
        azioni={
          <a
            href={`/api/report?da=${periodo.da}&a=${periodo.a}`}
            className="btn-secondario"
            download
          >
            Esporta CSV
          </a>
        }
      />

      {/* Un solo controllo di periodo. Il gestionale di riferimento ne ha due
          affiancati — Giorno/Settimana/Mese e un intervallo di date — che fanno
          la stessa cosa e possono contraddirsi. */}
      <nav aria-label="Periodo" className="flex flex-wrap gap-2">
        {predefiniti.map((p) => {
          const attivo = p.da === periodo.da && p.a === periodo.a;
          return (
            <Link
              key={p.etichetta}
              href={`/report?da=${p.da}&a=${p.a}`}
              aria-current={attivo ? "page" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                attivo
                  ? "border-accent bg-accent-soft text-accent font-medium"
                  : "border-line bg-surface text-ink-muted hover:text-ink hover:border-ink-faint"
              }`}
            >
              {p.etichetta}
            </Link>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metrica etichetta="Fatturato emesso" valore={formattaEuro(operativo.emesso)} />
        <Metrica etichetta="Incassato" valore={formattaEuro(operativo.incassato)} stato="ok" />
        <Metrica
          etichetta="Da incassare a fine periodo"
          valore={formattaEuro(operativo.daIncassare)}
          stato={operativo.daIncassare > 0 ? "warn" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metrica etichetta="Fatture emesse" valore={String(operativo.numeroFatture)} />
        <Metrica etichetta="Fattura media" valore={formattaEuro(operativo.fatturaMedia)} />
        <Metrica etichetta="Spese del periodo" valore={formattaEuro(totaleSpese)} />
        <Metrica
          etichetta="Margine sull'emesso"
          valore={formattaEuro(operativo.emesso - totaleSpese)}
          nota="Le spese non sono deducibili nel forfettario: è un dato gestionale, non fiscale."
        />
      </div>

      {concentrazione >= 50 && (
        <div className="rounded-xl border border-warn/40 bg-warn-soft px-5 py-4">
          <p className="text-sm text-warn font-medium">
            {perCliente[0].etichetta} vale il {concentrazione}% del fatturato del periodo.
          </p>
          <p className="text-sm text-ink-muted mt-1">
            Per chi lavora da solo la concentrazione su un committente è il rischio principale del
            mestiere: se quel rapporto si interrompe, si interrompe la maggior parte del reddito.
          </p>
        </div>
      )}

      <Classifica
        titolo="Fatturato per cliente"
        voci={perCliente}
        vuoto="Nessuna fattura emessa in questo periodo."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Classifica
          titolo="Spese per categoria"
          voci={perCategoria}
          vuoto="Nessuna spesa registrata in questo periodo."
        />
        <Classifica
          titolo="Spese per fornitore"
          voci={perFornitore}
          vuoto="Nessuna spesa collegata a un fornitore in anagrafica."
        />
      </div>
    </div>
  );
}

/**
 * Una classifica con la barra di quota.
 *
 * La barra non decora: la quota percentuale è il dato che dice se una voce
 * conta, e leggerla come lunghezza è più rapido che leggerla come numero. Il
 * numero resta comunque scritto accanto, perché una barra da sola non si può
 * confrontare fra due tabelle diverse.
 */
function Classifica({
  titolo,
  voci,
  vuoto,
}: {
  titolo: string;
  voci: VoceClassifica[];
  vuoto: string;
}) {
  return (
    <Scheda titolo={titolo}>
      {voci.length === 0 ? (
        <Vuoto messaggio={vuoto} />
      ) : (
        <div className="divide-y divide-line">
          {voci.map((voce) => (
            <div key={voce.chiave} className="px-4 sm:px-5 py-3">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0 truncate">{voce.etichetta}</span>
                <span className="shrink-0 flex items-baseline gap-3">
                  <span className="text-xs text-ink-faint tabular-nums">{voce.quota}%</span>
                  <span className="tabular-nums font-medium">{formattaEuro(voce.totale)}</span>
                </span>
              </div>
              <div
                className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(voce.quota, 1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Scheda>
  );
}
