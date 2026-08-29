import { NextResponse } from "next/server";
import { richiediUtente } from "@/lib/auth";
import { leggiCliente } from "@/lib/data/clienti";
import { assegnaProgressivoXml, leggiFattura } from "@/lib/data/fatture";
import { leggiDatiEmittente } from "@/lib/data/profilo";
import { numeroFattura } from "@/lib/domain/fattura";
import { generaXmlFattura, nomeFileXml, validaFatturaPerXml } from "@/lib/domain/fatturaXml";

/**
 * Scarica l'XML FatturaPA di un documento.
 *
 * L'ordine delle operazioni è deliberato: prima si valida, poi si assegna il
 * progressivo del nome file, infine si genera. Assegnare il progressivo prima
 * della validazione brucerebbe un nome file per una fattura che non è nemmeno
 * pronta — e i nomi file non si riusano mai.
 */
export async function GET(_richiesta: Request, contesto: { params: Promise<{ id: string }> }) {
  const { id } = await contesto.params;
  const { supabase, user } = await richiediUtente();

  const fattura = await leggiFattura(supabase, user.id, id);
  if (!fattura) {
    return NextResponse.json({ errore: "Documento non trovato." }, { status: 404 });
  }

  const [cliente, emittente] = await Promise.all([
    leggiCliente(supabase, user.id, fattura.clienteId),
    leggiDatiEmittente(supabase, user.id),
  ]);
  if (!cliente || !emittente) {
    return NextResponse.json({ errore: "Dati del cliente o del profilo mancanti." }, { status: 409 });
  }

  const riferimento = fattura.fatturaRiferimentoId
    ? await leggiFattura(supabase, user.id, fattura.fatturaRiferimentoId)
    : null;

  const contestoFattura = {
    fattura,
    cliente,
    emittente,
    fatturaRiferimento: riferimento
      ? { numero: numeroFattura(riferimento), data: riferimento.dataEmissione }
      : null,
  };

  const errori = validaFatturaPerXml(contestoFattura);
  if (errori.length > 0) {
    return NextResponse.json(
      { errore: "Il documento non è pronto per lo SDI.", dettagli: errori },
      { status: 422 }
    );
  }

  const progressivo = await assegnaProgressivoXml(supabase, user.id, fattura.id);
  const xml = generaXmlFattura({ ...contestoFattura, fattura: { ...fattura, xmlProgressivo: progressivo } });
  const nomeFile = nomeFileXml(emittente.codiceFiscale!, progressivo);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeFile}"`,
      // Il file contiene dati fiscali: non deve finire in nessuna cache condivisa.
      "Cache-Control": "no-store, private",
    },
  });
}
