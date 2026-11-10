"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";

// God only (Kai, 11 Nov 2026: "a panel in god mode where I can change the
// order of the list of items in the build your kit view"). Drag a row, or
// use the arrows, then Save order. The order is shared by every community
// (equipment_order, set by set_equipment_order).
export type OrderItem = { key: string; name: string; essential: boolean };

export function EquipmentOrderButton({
  items,
  onSaved,
}: {
  items: OrderItem[]; // in the current order
  onSaved: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        Change order
      </button>
      {open && (
        <OrderSheet
          items={items}
          onClose={() => setOpen(false)}
          onSaved={(keys) => {
            onSaved(keys);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function OrderSheet({
  items,
  onClose,
  onSaved,
}: {
  items: OrderItem[];
  onClose: () => void;
  onSaved: (keys: string[]) => void;
}) {
  const [list, setList] = useState(items);
  const [dragging, setDragging] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = list.some((x, i) => x.key !== items[i].key);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    setList((l) => {
      const n = [...l];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x);
      return n;
    });
  };

  async function save() {
    setSaving(true);
    setError("");
    const keys = list.map((x) => x.key);
    const { error } = await createClient().rpc("set_equipment_order", {
      p_keys: keys,
    });
    setSaving(false);
    if (error) setError("Couldn't save the order. Try again.");
    else onSaved(keys);
  }

  return (
    <Sheet title="Order of the equipment list" onClose={onClose}>
      <div className="text-left">
        <p className="text-sm text-stone-600">
          Drag an item, or use the arrows. This is the order every community
          sees when building their kit. Only you can change it.
        </p>
        <ol className="mt-3 divide-y divide-black/5 rounded-xl ring-1 ring-black/10">
          {list.map((x, i) => (
            <li
              key={x.key}
              draggable
              onDragStart={(e) => {
                setDragging(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                if (dragging !== i) {
                  move(dragging, i);
                  setDragging(i);
                }
              }}
              onDragEnd={() => setDragging(null)}
              className={`flex cursor-grab items-center gap-2 px-3 py-2 text-sm ${dragging === i ? "bg-pink/10" : "bg-white"}`}
            >
              <span aria-hidden className="text-stone-400">
                ⠿
              </span>
              <span className="w-5 text-right text-xs text-stone-400">
                {i + 1}
              </span>
              <span className="flex-1 font-medium text-navy">{x.name}</span>
              {x.essential && (
                <span className="rounded-full bg-pink px-2 py-0.5 text-[11px] font-semibold text-navy">
                  Essential
                </span>
              )}
              <button
                type="button"
                aria-label={`Move ${x.name} up`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                className="rounded px-1.5 text-stone-500 hover:text-navy disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${x.name} down`}
                disabled={i === list.length - 1}
                onClick={() => move(i, i + 1)}
                className="rounded px-1.5 text-stone-500 hover:text-navy disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-3">
          {changed && (
            <button
              type="button"
              onClick={() => setList(items)}
              className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            disabled={!changed || saving}
            onClick={save}
            className="rounded-full bg-pink px-4 py-1.5 text-sm font-semibold text-navy disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
