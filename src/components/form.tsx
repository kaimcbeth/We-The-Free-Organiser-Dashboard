// Small shared form pieces so every form looks the same.

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
        {hint && <span className="font-normal text-stone-400"> · {hint}</span>}
      </label>
      {children}
    </div>
  );
}
