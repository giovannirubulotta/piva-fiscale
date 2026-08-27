import { richiediUtente } from "@/lib/auth";
import { leggiSpese } from "@/lib/data/spese";
import { formattaEuro, formattaData } from "@/lib/ui/format";
import { NuovaSpesaForm } from "./NuovaSpesaForm";
import { rimuoviSpesa } from "./actions";

export default async function PaginaSpese() {
  const { supabase, user } = await richiediUtente();
  const spese = await leggiSpese(supabase, user.id);
  const totale = spese.reduce((sum, s) => sum + s.importo, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Spese</h1>
        <p className="text-sm text-ink-muted">
          Il regime forfettario non le deduce dal reddito imponibile — sono qui solo per capire cosa resta davvero
          in tasca dopo tasse e contributi.
        </p>
      </div>

      <NuovaSpesaForm />

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrizione</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium text-right">Importo</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {spese.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  Nessuna spesa registrata ancora.
                </td>
              </tr>
            )}
            {spese.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-ink-muted">{formattaData(s.data)}</td>
                <td className="px-4 py-3">{s.descrizione}</td>
                <td className="px-4 py-3 text-ink-muted">{s.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(s.importo)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={rimuoviSpesa}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-xs text-danger hover:underline">
                      elimina
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
          {spese.length > 0 && (
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={3} className="px-4 py-3 text-ink-muted text-right">
                  Totale
                </td>
                <td className="px-4 py-3 text-right font-medium">{formattaEuro(totale)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
