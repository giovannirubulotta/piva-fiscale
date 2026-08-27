import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiIncassi } from "@/lib/data/incassi";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali, generaScadenzeBollo } from "@/lib/domain/scadenzario";
import { formattaEuro, formattaData, giorniMancanti } from "@/lib/ui/format";
import { segnaPagata, segnaNonPagata } from "./actions";

export default async function PaginaScadenze() {
  const { supabase, user } = await richiediUtente();
  const profilo = await leggiProfilo(supabase, user.id);

  if (!profilo || !profilo.dataApertura) {
    return <p className="text-sm text-ink-muted">Completa prima il profilo in Impostazioni.</p>;
  }

  const [tutteLeAliquote, incassi, statiScadenze] = await Promise.all([
    leggiAliquote(supabase),
    leggiIncassi(supabase, user.id),
    leggiStatiScadenze(supabase, user.id),
  ]);

  const annoCorrente = new Date().getFullYear();
  const chiusi = riepiloghiAnniChiusi(incassi, profilo, tutteLeAliquote, annoCorrente);
  const scadenzeAnnuali = generaScadenzeAnnuali(chiusi);

  const anniConIncassi = new Set(incassi.map((i) => new Date(i.dataEmissione).getFullYear()));
  const scadenzeBollo = [...anniConIncassi].flatMap((anno) => generaScadenzeBollo(incassi, anno));

  const righe = [
    ...scadenzeAnnuali.map((s) => ({
      chiave: s.chiave,
      descrizione: s.descrizione,
      data: s.dataScadenza,
      importo: s.importo,
      codiceTributo: s.codiceTributo,
    })),
    ...scadenzeBollo
      .filter((s) => s.importoDovuto > 0)
      .map((s) => ({
        chiave: s.chiave,
        descrizione: s.descrizione,
        data: s.dataScadenza,
        importo: s.importoDovuto,
        codiceTributo: "bollo virtuale",
      })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Scadenze</h1>
        <p className="text-sm text-ink-muted">
          Calcolate a partire dai riepiloghi degli anni chiusi. Segna una voce come pagata dopo aver versato l&apos;F24.
        </p>
      </div>

      {righe.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nessuna scadenza ancora: il primo anno di attività non genera versamenti.
        </p>
      ) : (
        <div className="rounded-xl border border-line bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
                <th className="px-4 py-3 font-medium">Scadenza</th>
                <th className="px-4 py-3 font-medium">Descrizione</th>
                <th className="px-4 py-3 font-medium">Codice tributo</th>
                <th className="px-4 py-3 font-medium text-right">Importo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {righe.map((r) => {
                const pagato = statiScadenze.get(r.chiave)?.pagato ?? false;
                const gg = giorniMancanti(r.data);
                return (
                  <tr key={r.chiave}>
                    <td className="px-4 py-3">
                      <div>{formattaData(r.data)}</div>
                      {!pagato && (
                        <div className={`text-xs ${gg < 0 ? "text-danger" : "text-ink-faint"}`}>
                          {gg < 0 ? `${Math.abs(gg)} giorni di ritardo` : `tra ${gg} giorni`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.descrizione}</td>
                    <td className="px-4 py-3 text-ink-muted">{r.codiceTributo}</td>
                    <td className="px-4 py-3 text-right">{formattaEuro(r.importo)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${pagato ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}
                      >
                        {pagato ? "pagata" : "da pagare"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={pagato ? segnaNonPagata : segnaPagata}>
                        <input type="hidden" name="chiave" value={r.chiave} />
                        <input type="hidden" name="importo" value={r.importo} />
                        <button type="submit" className="text-xs text-accent hover:underline">
                          {pagato ? "segna da pagare" : "segna pagata"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
