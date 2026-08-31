import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiSpese } from "@/lib/data/spese";
import { leggiFornitori } from "@/lib/data/fornitori";
import { formattaEuro, formattaData } from "@/lib/ui/format";
import { IntestazionePagina, Scheda } from "@/components/Pagina";
import { NuovaSpesaForm } from "./NuovaSpesaForm";
import { rimuoviSpesa } from "./actions";

export const metadata = { title: "Spese — GAR Studio" };

export default async function PaginaSpese() {
  const { supabase, user } = await richiediUtente();
  const [spese, fornitori] = await Promise.all([
    leggiSpese(supabase, user.id),
    leggiFornitori(supabase, user.id, true),
  ]);

  const totale = spese.reduce((sum, s) => sum + s.importo, 0);
  const nomi = new Map(fornitori.map((f) => [f.id, f.denominazione]));

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Spese"
        descrizione="Il regime forfettario non le deduce dal reddito imponibile — sono qui solo per capire cosa resta davvero in tasca dopo tasse e contributi."
        azioni={
          <Link href="/fornitori" className="btn-secondario">
            Fornitori
          </Link>
        }
      />

      <NuovaSpesaForm
        fornitori={fornitori.map((f) => ({
          id: f.id,
          denominazione: f.denominazione,
          categoriaPredefinita: f.categoriaPredefinita,
        }))}
      />

      <Scheda className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="px-4 py-3 etichetta-cifra font-medium">Data</th>
              <th className="px-4 py-3 etichetta-cifra font-medium">Descrizione</th>
              <th className="px-4 py-3 etichetta-cifra font-medium">Fornitore</th>
              <th className="px-4 py-3 etichetta-cifra font-medium">Categoria</th>
              <th className="px-4 py-3 etichetta-cifra font-medium text-right">Importo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {spese.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Nessuna spesa registrata ancora.
                </td>
              </tr>
            )}
            {spese.map((s) => (
              <tr key={s.id} className="riga-interattiva">
                <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{formattaData(s.data)}</td>
                <td className="px-4 py-3">{s.descrizione}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {s.fornitoreId ? (nomi.get(s.fornitoreId) ?? "—") : "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{s.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                  {formattaEuro(s.importo)}
                </td>
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
                <td colSpan={4} className="px-4 py-3 text-ink-muted text-right">
                  Totale
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formattaEuro(totale)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Scheda>
    </div>
  );
}
