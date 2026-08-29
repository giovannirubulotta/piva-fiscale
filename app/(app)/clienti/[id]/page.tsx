import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiCliente } from "@/lib/data/clienti";
import { ClienteForm } from "../ClienteForm";
import { salvaModificaCliente } from "../actions";

export default async function PaginaModificaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await richiediUtente();
  const cliente = await leggiCliente(supabase, user.id, id);
  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link href="/clienti" className="text-xs text-ink-muted hover:text-ink">
          ← Clienti
        </Link>
        <h1 className="text-xl font-semibold mt-2">
          {cliente.denominazione ?? [cliente.nome, cliente.cognome].filter(Boolean).join(" ")}
        </h1>
      </div>
      <ClienteForm cliente={cliente} azione={salvaModificaCliente} />
    </div>
  );
}
