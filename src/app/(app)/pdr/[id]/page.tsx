import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import type { Pdr } from "@/lib/pdr";
import { PdrForm } from "./pdr-form";

export default async function PdrDetailPage({
  params,
}: PageProps<"/pdr/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireOrganiser();
  const { data } = await supabase.rpc("pdr_get", { p_id: id });
  if (!data) notFound();
  return <PdrForm initial={data as Pdr} myName={organiser.name} />;
}
