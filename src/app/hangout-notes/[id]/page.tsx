import { HangoutNotes } from "@/components/hangout-notes";

// Speaker notes for a planned hangout: a second window that follows the
// slides while presenting, or a run sheet on a phone (Kai, 13 Nov 2026).
export default async function HangoutNotesPage({
  params,
}: PageProps<"/hangout-notes/[id]">) {
  const { id } = await params;
  return <HangoutNotes planId={id} />;
}
