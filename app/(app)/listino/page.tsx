import { richiediUtente } from "@/lib/auth";
import { leggiListino } from "@/lib/data/listino";
import { formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Scheda, Vuoto } from "@/components/Pagina";
import { NuovaVoceForm } from "./NuovaVoceForm";
import { attivaDisattivaVoce, rimuoviVoce } from "./actions";

export default async function PaginaListino() {
  const { supabase, user } = await richiediUtente();
  const voci = await leggiListino(supabase, user.id);

  const attive = voci.filter((v) => v.attivo);
  const ritirate = voci.filter((v) => !v.attivo);

  return (
    <div className="flex flex-col gap-8">
      <IntestazionePagina
        titolo="Listino"
        descrizione="Le prestazioni che offri più spesso, salvate una volta e richiamate in preventivo o in fattura. Ribattere un importo a mano è il modo più comune di sbagliarlo."
      />

      <NuovaVoceForm />

      <Scheda titolo={attive.length === 1 ? "1 voce attiva" : `${attive.length} voci attive`}>
        {attive.length === 0 ? (
          <Vuoto messaggio="Il listino è vuoto: aggiungi la prima prestazione qui sopra." />
        ) : (
          <ul className="divide-y divide-line">
            {attive.map((voce) => (
              <li key={voce.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 text-sm riga-interattiva">
                <div className="min-w-0 flex-1">
                  <div>{voce.descrizione}</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {[voce.categoria, voce.unitaMisura && `al ${voce.unitaMisura}`, voce.note]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </div>
                <div className="tabular-nums shrink-0">{formattaEuro(voce.prezzoUnitario)}</div>
                <form action={attivaDisattivaVoce} className="shrink-0">
                  <input type="hidden" name="id" value={voce.id} />
                  <input type="hidden" name="attivo" value="false" />
                  <button type="submit" className="text-xs text-ink-muted hover:text-ink">
                    ritira
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Scheda>

      {ritirate.length > 0 && (
        <Scheda titolo="Ritirate">
          <ul className="divide-y divide-line">
            {ritirate.map((voce) => (
              <li key={voce.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="min-w-0 flex-1 text-ink-muted">{voce.descrizione}</div>
                <div className="tabular-nums shrink-0 text-ink-muted">{formattaEuro(voce.prezzoUnitario)}</div>
                <form action={attivaDisattivaVoce} className="shrink-0">
                  <input type="hidden" name="id" value={voce.id} />
                  <input type="hidden" name="attivo" value="true" />
                  <button type="submit" className="text-xs text-accent hover:underline">
                    rimetti
                  </button>
                </form>
                <form action={rimuoviVoce} className="shrink-0">
                  <input type="hidden" name="id" value={voce.id} />
                  <button type="submit" className="text-xs text-danger hover:underline">
                    elimina
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Scheda>
      )}

      <p className="text-xs text-ink-faint">
        Le voci si ritirano invece di essere eliminate: una prestazione che non offri più resta comunque citata nelle
        fatture già emesse, e un elenco storico con dei buchi è peggio di un elenco lungo.
      </p>
    </div>
  );
}
