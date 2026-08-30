import { NextRequest, NextResponse } from "next/server";
import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiFatture, leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiSpese } from "@/lib/data/spese";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiProfilo, leggiDatiEmittente } from "@/lib/data/profilo";
import { nomeCliente } from "@/lib/domain/cliente";
import { imponibileFiscale, numeroFattura, totaleDocumento } from "@/lib/domain/fattura";
import { generaXmlFattura, nomeFileXml } from "@/lib/domain/fatturaXml";
import { aliquoteAnno, calcolaRiepilogoAnno } from "@/lib/domain/calcolo";
import { creaZip, testoInBytes, type VoceZip } from "@/lib/domain/zip";
import { registraErrore } from "@/lib/osservabilita/log";

/**
 * L'anno fiscale in un archivio solo, da consegnare al commercialista.
 *
 * Contiene ciò che serve a chi deve compilare la dichiarazione: il riepilogo dei
 * numeri, l'elenco dei documenti in formato foglio di calcolo, e gli XML
 * effettivamente trasmessi allo SDI.
 *
 * **Gli XML si rigenerano, non si inventano progressivi.** `generaXmlFattura` è
 * una funzione pura e non tocca il registro dei nomi file: qui si esportano solo
 * le fatture che un progressivo ce l'hanno già, cioè quelle davvero preparate
 * per lo SDI. Per le altre si scriverebbe un nome file plausibile ma mai
 * assegnato — e un file del genere, se qualcuno lo trasmettesse, brucerebbe un
 * nome senza che il registro lo sappia. Le fatture escluse sono elencate nel
 * README dell'archivio invece di sparire in silenzio.
 */
export async function GET(request: NextRequest) {
  const { supabase, user } = await richiediUtente();

  const annoParam = request.nextUrl.searchParams.get("anno");
  const anno = annoParam ? Number(annoParam) : new Date().getFullYear();
  if (!Number.isInteger(anno) || anno < 2000 || anno > 2100) {
    return NextResponse.json({ errore: "Anno non valido." }, { status: 400 });
  }

  try {
    const [fatture, clienti, spese, tutteLeAliquote, profilo, emittente, incassi] = await Promise.all([
      leggiFatture(supabase, user.id),
      leggiClienti(supabase, user.id),
      leggiSpese(supabase, user.id),
      leggiAliquote(supabase),
      leggiProfilo(supabase, user.id),
      leggiDatiEmittente(supabase, user.id),
      leggiIncassiDaFatture(supabase, user.id),
    ]);

    const nomi = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
    const dellAnno = fatture.filter((f) => f.anno === anno && f.stato !== "annullata");
    const speseDellAnno = spese.filter((s) => s.data.slice(0, 4) === String(anno));

    const voci: VoceZip[] = [];
    const senzaXml: string[] = [];

    for (const fattura of dellAnno) {
      const cliente = clienti.find((c) => c.id === fattura.clienteId);
      if (!cliente || !emittente || !fattura.xmlProgressivo) {
        senzaXml.push(numeroFattura(fattura));
        continue;
      }
      const riferimento = fattura.fatturaRiferimentoId
        ? fatture.find((f) => f.id === fattura.fatturaRiferimentoId)
        : null;
      const xml = generaXmlFattura({
        fattura,
        cliente,
        emittente,
        fatturaRiferimento: riferimento
          ? { numero: numeroFattura(riferimento), data: riferimento.dataEmissione }
          : null,
      });
      const nomeFile = nomeFileXml(emittente.codiceFiscale ?? emittente.partitaIva ?? "", fattura.xmlProgressivo);
      voci.push({ nome: `xml-trasmessi/${nomeFile}`, contenuto: testoInBytes(xml) });
    }

    voci.push({ nome: `fatture-${anno}.csv`, contenuto: testoInBytes(csvFatture(dellAnno, nomi)) });
    voci.push({ nome: `spese-${anno}.csv`, contenuto: testoInBytes(csvSpese(speseDellAnno)) });

    const aliquote = aliquoteAnno(tutteLeAliquote, anno);
    const riepilogo =
      profilo && aliquote ? calcolaRiepilogoAnno(anno, incassi, profilo, aliquote) : null;

    voci.push({
      nome: "LEGGIMI.txt",
      contenuto: testoInBytes(leggimi(anno, dellAnno.length, speseDellAnno.length, senzaXml, riepilogo)),
    });

    const archivio = creaZip(voci);

    return new NextResponse(new Uint8Array(archivio), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="fiscale-${anno}.zip"`,
        "Content-Length": String(archivio.length),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "api.esportazione.GET",
      messaggio: "Creazione dell'archivio annuale non riuscita.",
      causa,
    });
    return NextResponse.json({ errore: "Non è stato possibile creare l'archivio." }, { status: 500 });
  }
}

function csvEscape(valore: string): string {
  return /[;"\n]/.test(valore) ? `"${valore.replace(/"/g, '""')}"` : valore;
}

/** Importi con virgola decimale e senza simbolo: in un foglio di calcolo "1.234,56 €" è testo e non si somma. */
function importo(valore: number): string {
  return valore.toFixed(2).replace(".", ",");
}

const BOM = "﻿";

function csvFatture(fatture: Awaited<ReturnType<typeof leggiFatture>>, nomi: Map<string, string>): string {
  const intestazione = [
    "Tipo",
    "Numero",
    "Cliente",
    "Data emissione",
    "Data incasso",
    "Stato",
    "Imponibile",
    "Totale documento",
    "Bollo",
  ];
  const righe = fatture.map((f) => {
    const segno = f.tipoDocumento === "TD04" ? -1 : 1;
    return [
      f.tipoDocumento === "TD04" ? "Nota di credito" : "Fattura",
      numeroFattura(f),
      nomi.get(f.clienteId) ?? "",
      f.dataEmissione,
      f.dataIncasso ?? "",
      f.stato,
      importo(segno * imponibileFiscale(f)),
      importo(segno * totaleDocumento(f)),
      f.bolloApplicato ? (f.bolloRiaddebitato ? "riaddebitato" : "a carico dell'emittente") : "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";");
  });
  return BOM + [intestazione.join(";"), ...righe].join("\n") + "\n";
}

function csvSpese(spese: Awaited<ReturnType<typeof leggiSpese>>): string {
  const intestazione = ["Data", "Descrizione", "Categoria", "Importo"];
  const righe = spese.map((s) =>
    [s.data, s.descrizione, s.categoria ?? "", importo(s.importo)].map((v) => csvEscape(String(v))).join(";")
  );
  return BOM + [intestazione.join(";"), ...righe].join("\n") + "\n";
}

function leggimi(
  anno: number,
  quanteFatture: number,
  quanteSpese: number,
  senzaXml: string[],
  riepilogo: ReturnType<typeof calcolaRiepilogoAnno> | null
): string {
  const righe = [
    `Archivio fiscale ${anno}`,
    `Generato il ${new Date().toISOString().slice(0, 10)}`,
    "",
    "CONTENUTO",
    `- fatture-${anno}.csv — documenti emessi nell'anno, escluse le fatture annullate.`,
    `- spese-${anno}.csv — spese registrate (${quanteSpese}). Nel regime forfettario non sono deducibili:`,
    "  servono a capire cosa resta in tasca, non a ridurre l'imponibile.",
    "- xml-trasmessi/ — gli XML delle fatture per cui era già stato generato il file per lo SDI.",
    "",
    "NOTE SUL CALCOLO",
    "Il regime forfettario tassa per cassa: conta la data di incasso, non quella di emissione.",
    "L'imposta sostitutiva è calcolata sul reddito forfettario al netto dei contributi INPS",
    "(art. 1 comma 64 L. 190/2014).",
  ];

  if (riepilogo) {
    righe.push(
      "",
      `RIEPILOGO ${anno} (stima dell'applicazione, non una dichiarazione)`,
      `Fatturato incassato:     ${importo(riepilogo.fatturatoIncassato)} EUR`,
      `Imponibile forfettario:  ${importo(riepilogo.imponibile)} EUR`,
      `Contributi INPS stimati: ${importo(riepilogo.contributiInps)} EUR`,
      `Imposta sostitutiva:     ${importo(riepilogo.impostaSostitutiva)} EUR (aliquota ${(riepilogo.aliquotaSostitutivaApplicata * 100).toFixed(0)}%)`,
      `Totale dovuto stimato:   ${importo(riepilogo.totaleDovuto)} EUR`
    );
  } else {
    righe.push("", "Riepilogo non calcolabile: profilo fiscale o aliquote dell'anno mancanti.");
  }

  righe.push("", `Documenti nell'archivio: ${quanteFatture}.`);

  if (senzaXml.length > 0) {
    righe.push(
      "",
      "DOCUMENTI SENZA XML NELL'ARCHIVIO",
      "Per questi non era ancora stato generato il file per il Sistema di Interscambio,",
      "quindi non hanno un numero di trasmissione assegnato. Non sono stati ricostruiti qui:",
      "un XML con un nome file mai assegnato, se venisse trasmesso, brucerebbe quel nome",
      "senza che il registro dei progressivi lo sappia.",
      ...senzaXml.map((n) => `- ${n}`)
    );
  }

  return righe.join("\n") + "\n";
}
