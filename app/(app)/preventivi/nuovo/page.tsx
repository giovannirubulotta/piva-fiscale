import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiListino } from "@/lib/data/listino";
import { nomeCliente } from "@/lib/domain/cliente";
import { IntestazionePagina } from "@/components/Pagina";
import { NuovoPreventivoForm } from "./NuovoPreventivoForm";
import Link from "next/link";

export default async function PaginaNuovoPreventivo({ searchParams }: PageProps<"/preventivi/nuovo">) {
  const parametri = await searchParams;
  const clientePredefinito = typeof parametri.cliente === "string" ? parametri.cliente : undefined;
  const { supabase, user } = await richiediUtente();

  const [clienti, listino] = await Promise.all([
    leggiClienti(supabase, user.id),
    leggiListino(supabase, user.id, true),
  ]);

  const oggi = new Date();
  const fra30 = new Date(oggi);
  fra30.setDate(fra30.getDate() + 30);

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina ritorno={{ href: "/preventivi", testo: "Preventivi" }} titolo="Nuovo preventivo" />

      {clienti.length === 0 ? (
        <div className="scheda p-6 text-sm text-ink-muted">
          Serve almeno un cliente in anagrafica.{" "}
          <Link href="/clienti/nuovo" className="text-accent hover:underline">
            Aggiungine uno
          </Link>
          .
        </div>
      ) : (
        <NuovoPreventivoForm
          clientePredefinito={clientePredefinito}
          clienti={clienti.map((c) => ({ id: c.id, nome: nomeCliente(c) }))}
          listino={listino.map((v) => ({
            id: v.id,
            descrizione: v.descrizione,
            prezzoUnitario: v.prezzoUnitario,
            unitaMisura: v.unitaMisura,
          }))}
          oggi={oggi.toISOString().slice(0, 10)}
          fraTrentaGiorni={fra30.toISOString().slice(0, 10)}
        />
      )}
    </div>
  );
}
