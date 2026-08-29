import { richiediUtente } from "@/lib/auth";
import { leggiLavoroDipendente } from "@/lib/data/lavoroDipendente";
import { formattaEuro } from "@/lib/ui/format";
import { NuovoLavoroDipendenteForm } from "./NuovoLavoroDipendenteForm";
import { rimuoviLavoroDipendente } from "./actions";

export default async function PaginaLavoroDipendente() {
  const { supabase, user } = await richiediUtente();
  const righe = await leggiLavoroDipendente(supabase, user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Lavoro dipendente (Quadro RC)</h1>
        <p className="text-sm text-ink-muted">
          Registro dei dati dalle Certificazioni Uniche (CU) ricevute come lavoratore dipendente, in vista del
          Quadro RC del Modello Redditi — utile da settembre 2026, quando inizi anche un rapporto di lavoro
          dipendente insieme all&apos;attività da libero professionista.
        </p>
      </div>

      <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn flex flex-col gap-1.5">
        <p className="font-medium">Questo è un registro dati, non un calcolatore IRPEF</p>
        <p className="text-xs text-warn/80">
          Qui l&apos;app registra soltanto quanto riportato in CU: reddito imponibile, ritenute e addizionali già
          trattenute. Non ricalcola l&apos;IRPEF dovuta sul reddito complessivo (redditi da lavoro dipendente + reddito
          forfettario tassato a parte non rientra nel calcolo a scaglioni; l&apos;imposta sostitutiva del regime
          forfettario resta separata e comunque dovuta per intero). Il calcolo dell&apos;IRPEF a scaglioni sul Quadro
          RN, con le detrazioni da lavoro dipendente, le eventuali eccedenze e il conguaglio finale, non è ancora
          disponibile in questo software: verificalo con un CAF, un commercialista o tramite la dichiarazione
          precompilata dell&apos;Agenzia delle Entrate.
        </p>
      </div>

      <NuovoLavoroDipendenteForm />

      <div className="rounded-xl border border-line bg-surface overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-3 font-medium">Anno</th>
              <th className="px-4 py-3 font-medium">Datore di lavoro</th>
              <th className="px-4 py-3 font-medium text-right">Reddito imponibile</th>
              <th className="px-4 py-3 font-medium text-right">Ritenute IRPEF</th>
              <th className="px-4 py-3 font-medium text-right">Add. regionale</th>
              <th className="px-4 py-3 font-medium text-right">Add. comunale</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {righe.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                  Nessuna CU registrata ancora.
                </td>
              </tr>
            )}
            {righe.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.anno}</td>
                <td className="px-4 py-3 text-ink-muted">{r.datoreLavoro ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(r.redditoImponibile)}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(r.ritenuteIrpef)}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(r.addizionaleRegionale)}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(r.addizionaleComunale)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={rimuoviLavoroDipendente}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs text-danger hover:underline">
                      elimina
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
