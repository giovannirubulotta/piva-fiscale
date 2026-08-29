import { categorieRiferimenti } from "@/lib/content/riferimentiNormativi";

export default function PaginaRiferimentiNormativi() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Riferimenti normativi</h1>
        <p className="text-sm text-ink-muted">
          Le regole verificate che riguardano davvero la tua situazione — libero professionista in regime
          forfettario, Gestione Separata INPS, e dal 2026 anche il lavoro dipendente a Chieri — non un archivio
          generico. Ogni voce indica le fonti e la data di verifica: rileggila quando cambiano le circolari
          annuali o la normativa, non prenderla come immutabile. Le voci segnate{" "}
          <span className="text-warn font-medium">area grigia</span> sono punti dove le fonti stesse non danno una
          risposta meccanica: lì serve davvero un professionista, per il caso specifico.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {categorieRiferimenti.map((categoria) => (
          <section key={categoria.id} className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">{categoria.titolo}</h2>
              {categoria.nota && <p className="text-xs text-ink-faint mt-0.5">{categoria.nota}</p>}
            </div>

            <div className="flex flex-col gap-2">
              {categoria.voci.map((voce) => (
                <details key={voce.id} id={voce.id} className="group rounded-xl border border-line bg-surface">
                  <summary className="marker:hidden [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {voce.titolo}
                      {voce.areaGrigia && (
                        <span className="text-[10px] uppercase tracking-wide text-warn border border-warn/40 bg-warn/10 rounded-full px-2 py-0.5">
                          Area grigia
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-ink-faint shrink-0 group-open:hidden">apri</span>
                    <span className="text-xs text-ink-faint shrink-0 hidden group-open:inline">chiudi</span>
                  </summary>

                  <div className="px-4 pb-4 flex flex-col gap-3 text-sm text-ink-muted border-t border-line pt-3">
                    {voce.corpo.split("\n\n").map((paragrafo, i) => (
                      <p key={i}>{paragrafo}</p>
                    ))}

                    {voce.tabella && (
                      <div className="overflow-x-auto rounded-lg border border-line">
                        <table className="w-full min-w-[420px] text-xs">
                          <thead>
                            <tr className="text-left text-ink-faint uppercase tracking-wide border-b border-line bg-surface-2">
                              {voce.tabella.intestazioni.map((int, i) => (
                                <th key={i} className="px-3 py-2 font-medium">
                                  {int}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {voce.tabella.righe.map((riga, i) => (
                              <tr key={i}>
                                {riga.map((cella, j) => (
                                  <td key={j} className="px-3 py-2">
                                    {cella}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {voce.notaVerifica && (
                      <p className="text-xs text-warn bg-warn/10 border border-warn/40 rounded-lg px-3 py-2">
                        {voce.notaVerifica}
                      </p>
                    )}

                    <div className="text-xs text-ink-faint flex flex-col gap-1 pt-1">
                      <div>
                        {voce.fonti.map((fonte, i) => (
                          <span key={fonte.url}>
                            {i > 0 && " · "}
                            <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">
                              {fonte.titolo}
                            </a>
                          </span>
                        ))}
                      </div>
                      <div>Verificato il {voce.verificatoIl}</div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
