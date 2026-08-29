import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali } from "@/lib/domain/scadenzario";
import { generaQuadroLm } from "@/lib/domain/quadroLm";
import { formattaEuro } from "@/lib/ui/format";

export default async function PaginaQuadroLm({ searchParams }: { searchParams: Promise<{ anno?: string }> }) {
  const { anno: annoParam } = await searchParams;
  const { supabase, user } = await richiediUtente();
  const profilo = await leggiProfilo(supabase, user.id);

  if (!profilo || !profilo.dataApertura) {
    return <p className="text-sm text-ink-muted">Completa prima il profilo in Impostazioni.</p>;
  }

  const [tutteLeAliquote, incassi, statiScadenze] = await Promise.all([
    leggiAliquote(supabase),
    leggiIncassiDaFatture(supabase, user.id),
    leggiStatiScadenze(supabase, user.id),
  ]);

  const annoCorrente = new Date().getFullYear();
  const chiusi = riepiloghiAnniChiusi(incassi, profilo, tutteLeAliquote, annoCorrente);

  if (chiusi.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-2">Quadro LM</h1>
        <p className="text-sm text-ink-muted">
          Nessun anno ancora chiuso: il quadro LM si può compilare a partire dal primo anno concluso di attività, nella
          dichiarazione dei redditi dell&apos;anno successivo.
        </p>
      </div>
    );
  }

  const annoRichiesto = annoParam ? Number(annoParam) : undefined;
  const riepilogo = chiusi.find((r) => r.anno === annoRichiesto) ?? chiusi[chiusi.length - 1];

  // LM45 riguarda solo gli acconti dell'imposta sostitutiva (codici 1790/1791)
  // dovuti per l'anno di riepilogo: quelli generati a partire dal riepilogo
  // dell'anno precedente, con annoRiferimento pari all'anno del riepilogo
  // corrente (vedi lib/domain/scadenzario.ts).
  const tutteLeScadenze = generaScadenzeAnnuali(chiusi);
  const accontiImposta = tutteLeScadenze.filter(
    (s) => s.annoRiferimento === riepilogo.anno && (s.tipo === "acconto1_imposta" || s.tipo === "acconto2_imposta")
  );
  const accontiVersatiTotale = accontiImposta.reduce((somma, s) => {
    const stato = statiScadenze.get(s.chiave);
    if (!stato?.pagato) return somma;
    return somma + (stato.importoPagato ?? s.importo);
  }, 0);

  const quadro = generaQuadroLm(riepilogo, profilo, accontiVersatiTotale);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-1">Quadro LM — anno {quadro.anno}</h1>
          <p className="text-sm text-ink-muted max-w-xl">
            Riepilogo dei righi principali della sezione del Quadro LM dedicata al regime forfettario nel modello
            Redditi PF. Non sostituisce la compilazione della dichiarazione: è una base già calcolata da riportare, da
            far controllare al tuo commercialista o intermediario prima dell&apos;invio.
          </p>
        </div>
        {chiusi.length > 1 && (
          <div className="flex gap-1.5">
            {chiusi.map((r) => (
              <Link
                key={r.anno}
                href={`/quadro-lm?anno=${r.anno}`}
                className={`rounded-lg px-3 py-1.5 text-sm border transition ${
                  r.anno === quadro.anno
                    ? "border-accent text-accent bg-accent/10"
                    : "border-line text-ink-muted hover:text-ink hover:bg-surface-2"
                }`}
              >
                {r.anno}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-line bg-surface px-5 py-4">
        <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">LM21 — Attestazioni</div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-ink-faint text-xs">Codice ATECO</div>
            <div>{quadro.attestazioni.codiceAteco}</div>
          </div>
          <div>
            <div className="text-ink-faint text-xs">Aliquota applicata</div>
            <div>{(quadro.attestazioni.aliquotaApplicata * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-ink-faint text-xs">Nuova attività agevolata (5%)</div>
            <div>{quadro.attestazioni.nuovaAttivitaAgevolata ? "Sì" : "No"}</div>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-line bg-surface overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-3 font-medium">Rigo</th>
              <th className="px-4 py-3 font-medium">Voce</th>
              <th className="px-4 py-3 font-medium text-right">Valore</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {quadro.righi.map((rigo, indice) => (
              <tr key={`${rigo.codice}-${indice}`}>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{rigo.codice}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {rigo.etichetta}
                    {rigo.daVerificare && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warn-soft text-warn shrink-0">
                        verifica
                      </span>
                    )}
                  </div>
                  {rigo.nota && <div className="text-xs text-ink-faint mt-0.5">{rigo.nota}</div>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {rigo.unita === "percentuale" ? `${rigo.valore.toFixed(2)}%` : formattaEuro(rigo.valore)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-line bg-surface-2 px-5 py-4 text-xs text-ink-muted">
        <p>
          I righi segnati &quot;verifica&quot; usano una stima calcolata dall&apos;app come proxy (contributi INPS per
          competenza, acconti segnati come pagati nello scadenzario): prima di trascriverli in dichiarazione,
          confronta i valori con quanto realmente versato. I righi relativi a perdite pregresse, crediti d&apos;imposta,
          ritenute ed eccedenze da anni precedenti non sono tracciati dall&apos;app: se ti riguardano, integrali con il
          tuo commercialista.
        </p>
      </div>
    </div>
  );
}
