// Shown when a list fails to load, so it never looks empty by mistake.
export function LoadError({ what }: { what: string }) {
  return (
    <div role="alert" className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-800">
      <p className="font-semibold">Couldn&apos;t load {what}.</p>
      <p className="mt-1">Check your connection and refresh the page. If it keeps happening, let Kai know.</p>
    </div>
  );
}
