import { richiediUtente } from "@/lib/auth";
import { leggiIncassi } from "@/lib/data/incassi";
import { formattaEuro, formattaData } from "@/lib/ui/format";
import { NuovoIncassoForm } from "./NuovoIncassoForm";
import { segnaIncassata, annullaIncasso, rimuoviIncasso } from "./actions";

export default async function PaginaIncassi() {
  const { supabase, user } = await richiediUtente();
  const incassi = await leggiIncassi(supabase, user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Incassi</h1>
        <p className="text-sm text-ink-muted">
          Conta la data di incasso, non quella di emissione: il forfettario tassa per cassa.
        </p>
      </div>

      <NuovoIncassoForm />

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Emissione</th>
              <th className="px-4 py-3 font-medium">Incasso</th>
              <th className="px-4 py-3 font-medium text-right">Importo</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {incassi.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Nessun incasso registrato ancora.
                </td>
              </tr>
            )}
            {incassi.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <div>{i.cliente}</div>
                  {(i.numeroFattura || i.descrizione) && (
                    <div className="text-xs text-ink-faint">
                      {[i.numeroFattura, i.descrizione].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{formattaData(i.dataEmissione)}</td>
                <td className="px-4 py-3 text-ink-muted">{i.dataIncasso ? formattaData(i.dataIncasso) : "—"}</td>
                <td className="px-4 py-3 text-right">{formattaEuro(i.importoNetto)}</td>
                <td className="px-4 py-3">
                  <Badge stato={i.stato} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {i.stato === "da_incassare" && (
                      <form action={segnaIncassata}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="data_incasso" value={new Date().toISOString().slice(0, 10)} />
                        <button type="submit" className="text-xs text-ok hover:underline">
                          segna incassata
                        </button>
                      </form>
                    )}
                    {i.stato !== "annullata" && (
                      <form action={annullaIncasso}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="text-xs text-ink-muted hover:underline">
                          annulla
                        </button>
                      </form>
                    )}
                    <form action={rimuoviIncasso}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="text-xs text-danger hover:underline">
                        elimina
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ stato }: { stato: "da_incassare" | "incassata" | "annullata" }) {
  const mappa = {
    da_incassare: { testo: "da incassare", classe: "bg-warn-soft text-warn" },
    incassata: { testo: "incassata", classe: "bg-ok-soft text-ok" },
    annullata: { testo: "annullata", classe: "bg-surface-2 text-ink-faint" },
  } as const;
  const { testo, classe } = mappa[stato];
  return <span className={`text-xs px-2 py-1 rounded-full ${classe}`}>{testo}</span>;
}
