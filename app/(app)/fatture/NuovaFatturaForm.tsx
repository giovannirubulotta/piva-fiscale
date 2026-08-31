"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { salvaNuovaFattura, type EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";
import { IMPORTO_BOLLO, SOGLIA_BOLLO, bolloDovuto, dataScadenzaPagamento, totaleRiga, totaleRighe } from "@/lib/domain/fattura";
import { CAUSALI_FORFETTARIO } from "@/lib/domain/fatturaXml";
import { formattaEuro, formattaData } from "@/lib/ui/format";
import type { DatiEmittente, TipoDocumento } from "@/lib/domain/types";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export interface ClienteSelezionabile {
  id: string;
  nome: string;
  indirizzo: string | null;
  citta: string | null;
  identificativo: string | null;
  completo: boolean;
}

export interface FatturaStornabile {
  id: string;
  etichetta: string;
}

interface RigaBozza {
  chiave: number;
  descrizione: string;
  quantita: string;
  unitaMisura: string;
  prezzoUnitario: string;
}

function rigaVuota(chiave: number): RigaBozza {
  return { chiave, descrizione: "", quantita: "1", unitaMisura: "", prezzoUnitario: "" };
}

export function NuovaFatturaForm({
  clienti,
  fattureStornabili,
  emittente,
  oggi,
  clientePredefinito,
}: {
  clienti: ClienteSelezionabile[];
  fattureStornabili: FatturaStornabile[];
  emittente: DatiEmittente;
  oggi: string;
  /** Arrivando dalla scheda di un cliente, quel cliente e' gia' scelto. */
  clientePredefinito?: string;
}) {
  const [stato, invia, inCorso] = useActionState(salvaNuovaFattura, statoIniziale);

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("TD01");
  const [clienteId, setClienteId] = useState(
    clienti.find((c) => c.id === clientePredefinito)?.id ?? clienti[0]?.id ?? ""
  );
  const [dataEmissione, setDataEmissione] = useState(oggi);
  const [giorni, setGiorni] = useState("30");
  const [bolloRiaddebitato, setBolloRiaddebitato] = useState(emittente.bolloRiaddebitato);
  const [righe, setRighe] = useState<RigaBozza[]>([rigaVuota(1)]);

  const righeNumeriche = useMemo(
    () =>
      righe
        .filter((r) => r.descrizione.trim() !== "")
        .map((r) => ({
          descrizione: r.descrizione,
          quantita: Number(r.quantita) || 1,
          unitaMisura: r.unitaMisura || null,
          prezzoUnitario: Number(r.prezzoUnitario) || 0,
        })),
    [righe]
  );

  const imponibile = totaleRighe(righeNumeriche);
  const bollo = tipoDocumento === "TD01" && bolloDovuto(righeNumeriche);
  const totale = imponibile + (bollo && bolloRiaddebitato ? IMPORTO_BOLLO : 0);
  const cliente = clienti.find((c) => c.id === clienteId);
  const scadenza = dataScadenzaPagamento({ dataEmissione, giorniScadenzaPagamento: Number(giorni) || 0 });

  function aggiornaRiga(chiave: number, campo: keyof RigaBozza, valore: string) {
    setRighe((precedenti) => precedenti.map((r) => (r.chiave === chiave ? { ...r, [campo]: valore } : r)));
  }

  return (
    <form action={invia} className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
      {/* ------------------ Colonna: compilazione ------------------ */}
      <div className="flex flex-col gap-5 min-w-0">
        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Intestazione</h2>

          <InfoCampo etichetta="Tipo documento" spiegazione={spiegazioni.fatturaTipoDocumento}>
            <select
              name="tipoDocumento"
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
              className="campo-input"
            >
              <option value="TD01">Fattura (TD01)</option>
              <option value="TD04">Nota di credito (TD04)</option>
            </select>
          </InfoCampo>

          {tipoDocumento === "TD04" && (
            <InfoCampo etichetta="Fattura da stornare">
              <select name="fatturaRiferimentoId" required className="campo-input">
                <option value="">Seleziona la fattura…</option>
                {fattureStornabili.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.etichetta}
                  </option>
                ))}
              </select>
            </InfoCampo>
          )}

          <InfoCampo etichetta="Cliente">
            <select
              name="clienteId"
              required
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="campo-input"
            >
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.completo ? "" : " — dati incompleti"}
                </option>
              ))}
            </select>
          </InfoCampo>
          {cliente && !cliente.completo && (
            <p className="text-xs text-warn -mt-2">
              A questo cliente mancano dati obbligatori per la fattura elettronica: puoi salvare il documento, ma
              l&apos;XML per lo SDI non si potrà generare finché non li completi.{" "}
              <Link href={`/clienti/${cliente.id}`} className="underline">
                Completa ora
              </Link>
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCampo etichetta="Data">
              <input
                type="date"
                name="dataEmissione"
                required
                max={oggi}
                value={dataEmissione}
                onChange={(e) => setDataEmissione(e.target.value)}
                className="campo-input"
              />
            </InfoCampo>
            <InfoCampo etichetta="Stato">
              <select name="stato" defaultValue="emessa" className="campo-input">
                <option value="bozza">Bozza</option>
                <option value="emessa">Emessa</option>
                <option value="incassata">Già incassata</option>
              </select>
            </InfoCampo>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Prestazioni</h2>
            <button
              type="button"
              onClick={() => setRighe((r) => [...r, rigaVuota(Math.max(0, ...r.map((x) => x.chiave)) + 1)])}
              className="text-xs text-accent hover:underline"
            >
              + Aggiungi riga
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {righe.map((riga, indice) => (
              <div key={riga.chiave} className="rounded-lg border border-line bg-surface-2 p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-faint">Riga {indice + 1}</span>
                  {righe.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRighe((r) => r.filter((x) => x.chiave !== riga.chiave))}
                      className="text-xs text-danger hover:underline"
                    >
                      rimuovi
                    </button>
                  )}
                </div>
                <input
                  name="rigaDescrizione"
                  value={riga.descrizione}
                  onChange={(e) => aggiornaRiga(riga.chiave, "descrizione", e.target.value)}
                  placeholder="Descrizione della prestazione"
                  className="campo-input"
                  aria-label={`Descrizione riga ${indice + 1}`}
                />
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1 text-xs text-ink-muted">
                    Quantità
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      name="rigaQuantita"
                      value={riga.quantita}
                      onChange={(e) => aggiornaRiga(riga.chiave, "quantita", e.target.value)}
                      className="campo-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-muted">
                    Unità
                    <input
                      name="rigaUnita"
                      value={riga.unitaMisura}
                      onChange={(e) => aggiornaRiga(riga.chiave, "unitaMisura", e.target.value)}
                      placeholder="ore"
                      className="campo-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-muted">
                    Prezzo unitario €
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rigaPrezzo"
                      value={riga.prezzoUnitario}
                      onChange={(e) => aggiornaRiga(riga.chiave, "prezzoUnitario", e.target.value)}
                      className="campo-input"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Pagamento e bollo</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <InfoCampo etichetta="Condizioni" spiegazione={spiegazioni.fatturaCondizioniPagamento}>
              <select name="condizioniPagamento" defaultValue="TP02" className="campo-input">
                <option value="TP02">TP02 — unica soluzione</option>
                <option value="TP01">TP01 — a rate</option>
                <option value="TP03">TP03 — anticipo</option>
              </select>
            </InfoCampo>
            <InfoCampo etichetta="Modalità" spiegazione={spiegazioni.fatturaModalitaPagamento}>
              <select name="modalitaPagamento" defaultValue="MP05" className="campo-input">
                <option value="MP05">MP05 — bonifico</option>
                <option value="MP01">MP01 — contanti</option>
                <option value="MP08">MP08 — carta</option>
                <option value="MP02">MP02 — assegno</option>
              </select>
            </InfoCampo>
            <InfoCampo etichetta="Giorni" spiegazione={spiegazioni.fatturaGiorniScadenza}>
              <input
                type="number"
                min="0"
                name="giorniScadenzaPagamento"
                value={giorni}
                onChange={(e) => setGiorni(e.target.value)}
                className="campo-input"
              />
            </InfoCampo>
          </div>

          {bollo && (
            <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs text-warn flex flex-col gap-2">
              <p>
                Sopra {formattaEuro(SOGLIA_BOLLO)} la marca da bollo virtuale da {formattaEuro(IMPORTO_BOLLO)} è
                dovuta per legge: viene applicata automaticamente.
              </p>
              <label className="flex items-start gap-2 text-ink cursor-pointer">
                <input
                  type="checkbox"
                  name="bolloRiaddebitato"
                  checked={bolloRiaddebitato}
                  onChange={(e) => setBolloRiaddebitato(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Addebita i {formattaEuro(IMPORTO_BOLLO)} al cliente
                  <span className="block text-ink-muted">
                    Se attivo, i 2 € entrano in fattura come riga e concorrono al tuo reddito imponibile.
                  </span>
                </span>
              </label>
            </div>
          )}

          <InfoCampo etichetta="Causale aggiuntiva (opzionale)">
            <input name="causaleAggiuntiva" className="campo-input" placeholder="Riferimento contratto, commessa…" />
          </InfoCampo>
          <InfoCampo etichetta="Note interne (non compaiono in fattura)">
            <input name="note" className="campo-input" />
          </InfoCampo>
        </section>

        {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={inCorso} className="btn-primario">
            {inCorso ? "Salvataggio…" : "Salva documento"}
          </button>
          <Link href="/fatture" className="btn-secondario">
            Annulla
          </Link>
        </div>
      </div>

      {/* ------------------ Colonna: anteprima ------------------ */}
      <div className="lg:sticky lg:top-6 min-w-0">
        <div className="text-xs text-ink-faint mb-2">Anteprima</div>
        <div className="rounded-xl border border-line bg-surface-2 p-4 sm:p-6 flex flex-col gap-5 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-ink-faint uppercase tracking-wide">
                {tipoDocumento === "TD04" ? "Nota di credito" : "Fattura"}
              </div>
              <div className="font-medium truncate">
                {[emittente.nome, emittente.cognome].filter(Boolean).join(" ") || "Il tuo nome"}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {emittente.indirizzo} {emittente.numeroCivico}
                <br />
                {emittente.cap} {emittente.comune} {emittente.provincia && `(${emittente.provincia})`}
                <br />
                P.IVA {emittente.partitaIva ?? "—"}
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="text-ink-faint uppercase tracking-wide">Data</div>
              <div className="text-ink">{dataEmissione ? formattaData(dataEmissione) : "—"}</div>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <div className="text-xs text-ink-faint uppercase tracking-wide mb-1">Destinatario</div>
            <div className="font-medium">{cliente?.nome ?? "—"}</div>
            <div className="text-xs text-ink-muted">
              {cliente?.indirizzo} {cliente?.citta && `— ${cliente.citta}`}
              {cliente?.identificativo && (
                <>
                  <br />
                  {cliente.identificativo}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <div className="text-xs text-ink-faint uppercase tracking-wide mb-2">Prestazioni</div>
            {righeNumeriche.length === 0 ? (
              <p className="text-xs text-ink-faint">Le righe compilate compaiono qui.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {righeNumeriche.map((riga, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate">{riga.descrizione}</div>
                      <div className="text-xs text-ink-faint">
                        {riga.quantita} {riga.unitaMisura ?? ""} × {formattaEuro(riga.prezzoUnitario)}
                      </div>
                    </div>
                    <div className="shrink-0 tabular-nums">{formattaEuro(totaleRiga(riga))}</div>
                  </div>
                ))}
                {bollo && bolloRiaddebitato && (
                  <div className="flex items-baseline justify-between gap-3 text-ink-muted">
                    <div className="truncate text-xs">Imposta di bollo assolta in modo virtuale</div>
                    <div className="shrink-0 tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-line pt-4 flex flex-col gap-1.5">
            <div className="flex justify-between text-ink-muted text-xs">
              <span>Imponibile</span>
              <span className="tabular-nums">{formattaEuro(imponibile)}</span>
            </div>
            <div className="flex justify-between text-ink-muted text-xs">
              <span>IVA (regime forfettario, non soggetta)</span>
              <span className="tabular-nums">{formattaEuro(0)}</span>
            </div>
            {bollo && !bolloRiaddebitato && (
              <div className="flex justify-between text-ink-faint text-xs">
                <span>Bollo virtuale (a tuo carico)</span>
                <span className="tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-1.5 border-t border-line">
              <span>Totale documento</span>
              <span className="tabular-nums text-accent">{formattaEuro(totale)}</span>
            </div>
            <div className="text-xs text-ink-faint mt-1">
              Pagamento entro il {formattaData(scadenza)}
              {emittente.iban && (
                <>
                  <br />
                  IBAN {emittente.iban}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint flex flex-col gap-1">
            {CAUSALI_FORFETTARIO.map((causale) => (
              <p key={causale}>{causale}</p>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
