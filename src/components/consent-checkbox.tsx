"use client";

// Consent for texts and emails (Australia's Spam Act needs this before promotional messages).
export function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl bg-white p-3.5 ring-1 ring-stone-300">
      <input
        type="checkbox"
        name="consent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff47b9]"
      />
      <span className="text-sm text-stone-700">
        Happy to receive texts and emails about We The Free events. You can
        change this any time.
      </span>
    </label>
  );
}
