"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FORMS, type FormFields } from "@/lib/approval-forms";
import { inputClass } from "@/components/form";

type Fields = Omit<FormFields, "signature" | "date">;

const LABELS: Record<keyof Fields, string> = {
  name: "Your full legal name",
  address: "Your street address and suburb",
  postcode: "Postcode (4 digits)",
  phone: "Your phone",
  organisation: "On behalf of",
  day: "Day",
  monthYear: "Month and year",
  number: "Roughly how many people",
  place: "Where",
  start: "Starts at about",
  end: "Finishes at about",
  purpose: "Purpose",
  special: "Anything else about it",
  capacity: "Your role",
};

// Draw-once signature, saved privately to your profile.
function SignaturePad({ onChange }: { onChange: (png: Blob | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * c.width,
      ((e.clientY - r.top) / r.height) * c.height,
    ];
  }

  return (
    <div>
      <canvas
        ref={ref}
        width={600}
        height={200}
        className="h-28 w-full touch-none rounded-xl bg-white ring-1 ring-stone-300"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = ref.current!.getContext("2d")!;
          const [x, y] = point(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current!.getContext("2d")!;
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#0b1230";
          const [x, y] = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          setEmpty(false);
        }}
        onPointerUp={() => {
          drawing.current = false;
          ref.current!.toBlob((b) => onChange(b), "image/png");
        }}
      />
      <div className="mt-1 flex justify-between text-xs text-stone-500">
        <span>{empty ? "Sign with your finger or mouse" : "Looks good"}</span>
        <button
          type="button"
          onClick={() => {
            const c = ref.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setEmpty(true);
            onChange(null);
          }}
          className="hover:text-stone-800 hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function ApprovalForm({
  eventId,
  userId,
  form,
  authority,
  noticeDays,
  daysAway,
  sent,
  initial,
  hasSaved,
  signatureUrl,
  dateLine,
  filename,
  community,
}: {
  eventId: string;
  userId: string;
  form: string;
  authority: { name: string; greeting: string; email: string };
  noticeDays: number;
  daysAway: number;
  sent: { at: string; to: string; test: boolean }[];
  initial: Fields;
  hasSaved: boolean;
  signatureUrl: string | null;
  dateLine: string;
  filename: string;
  community: string;
}) {
  const [f, setF] = useState<Fields>(initial);
  const [editMine, setEditMine] = useState(!hasSaved || !signatureUrl);
  const [quick, setQuick] = useState(hasSaved && !!signatureUrl);
  const [sigBytes, setSigBytes] = useState<Uint8Array | null>(null);
  const [newSig, setNewSig] = useState<Blob | null>(null);
  const [subject, setSubject] = useState(
    `Form 1 - We The Free ${community} - ${dateLine}, ${initial.place}`,
  );
  const [body, setBody] = useState(
    `Dear ${authority.greeting},

Please see the attached Form 1 for our group for the date of ${dateLine} at ${initial.place}.

Please do not hesitate to get in contact if there are any assemblies or processions that may be helpful for us to be aware of in that area, or if you have any questions regarding the details of this notice.

Kind regards,

${initial.name}
${initial.capacity.split(",")[0]} | We The Free ${community}
www.activism.wtf`,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Their saved signature, as bytes for the PDF.
  useEffect(() => {
    if (!signatureUrl) return;
    fetch(signatureUrl)
      .then((r) => r.arrayBuffer())
      .then((b) => setSigBytes(new Uint8Array(b)))
      .catch(() => {});
  }, [signatureUrl]);

  const set = (k: keyof Fields) => (v: string) => setF({ ...f, [k]: v });
  const field = (k: keyof Fields, area = false) => (
    <label key={k} className="block text-sm font-medium text-stone-700">
      {LABELS[k]}
      {area ? (
        <textarea
          value={f[k]}
          onChange={(e) => set(k)(e.target.value)}
          rows={2}
          className={`${inputClass} mt-1`}
        />
      ) : (
        <input
          value={f[k]}
          onChange={(e) => set(k)(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      )}
    </label>
  );

  async function signature(): Promise<Uint8Array | null> {
    if (newSig) return new Uint8Array(await newSig.arrayBuffer());
    return sigBytes;
  }

  const today = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  }).format(new Date());

  async function build() {
    const render = FORMS[form]?.render;
    if (!render) throw new Error("No form for this area yet.");
    return render({ ...f, date: today, signature: await signature() });
  }

  // Returns true once saved (false + a message if something's missing).
  async function saveMine(): Promise<boolean> {
    setError("");
    const fail = (m: string) => {
      setError(m);
      return false;
    };
    if (f.name.trim().split(/\s+/).length < 2)
      return fail(
        "Add your full name (first and last), as the police need it.",
      );
    if (!f.address.trim()) return fail("Add your street address and suburb.");
    if (!/^\d{4}$/.test(f.postcode.trim()))
      return fail("The postcode should be 4 numbers, like 2000.");
    if (!f.phone.trim()) return fail("Add your phone number.");
    if (!newSig && !sigBytes) return fail("Add your signature.");
    setBusy(true);
    const supabase = createClient();
    let signature_path: string | undefined;
    if (newSig) {
      signature_path = `${userId}/signature.png`;
      const up = await supabase.storage
        .from("signatures")
        .upload(signature_path, newSig, {
          upsert: true,
          contentType: "image/png",
        });
      if (up.error) {
        setBusy(false);
        return fail("Couldn't save your signature. Please try again.");
      }
      setSigBytes(new Uint8Array(await newSig.arrayBuffer()));
      setNewSig(null);
    }
    const { error: e } = await supabase.from("person_private").upsert({
      user_id: userId,
      legal_name: f.name.trim(),
      address: f.address.trim(),
      postcode: f.postcode.trim(),
      phone: f.phone.trim(),
      ...(signature_path ? { signature_path } : {}),
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (e) return fail("Couldn't save your details. Please try again.");
    setEditMine(false);
    return true;
  }

  async function showPreview() {
    setError("");
    try {
      const bytes = await build();
      if (preview) URL.revokeObjectURL(preview);
      setPreview(
        URL.createObjectURL(
          new Blob([bytes as BlobPart], { type: "application/pdf" }),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send(test: boolean) {
    setError("");
    setStatus("");
    // Not saved yet? Save them on the way.
    if (editMine && !(await saveMine())) return;
    setBusy(true);
    try {
      const bytes = await build();
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      const { data, error: e } = await createClient().functions.invoke(
        "send-approval",
        {
          body: {
            eventId,
            pdfBase64: btoa(bin),
            subject,
            body,
            test,
            filename,
          },
        },
      );
      if (e || data?.error) {
        let msg = data?.error as string | undefined;
        if (!msg && e && "context" in e) {
          try {
            msg = (await (e.context as Response).json()).error;
          } catch {}
        }
        throw new Error(msg ?? "Couldn't send it. Please try again.");
      }
      if (test)
        setStatus(
          "Test sent to your email. Have a look, then send it for real.",
        );
      else {
        setDone(true);
        setStatus(
          `Sent to ${authority.email}. You're CC'd, and any reply comes to you.`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const late = daysAway < noticeDays;
  const realSent = sent.filter((s) => !s.test);

  const notices = (
    <>
      {realSent.length > 0 && (
        <p className="rounded-2xl bg-cyan/20 px-4 py-3 text-sm text-navy">
          Already sent{" "}
          {new Date(realSent[0].at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          })}{" "}
          to {realSent[0].to.split(",")[0]}. You can send an updated one if
          something changed.
        </p>
      )}
      {late && (
        <p className="rounded-2xl bg-pink/15 px-4 py-3 text-sm text-navy">
          <b>Short notice:</b> {authority.name} asks for at least {noticeDays}{" "}
          days, and this event is{" "}
          {daysAway <= 0 ? "today" : `${daysAway} days away`}. You can still
          send it.
        </p>
      )}
    </>
  );

  // Details saved before: everything's filled in, so it's one tap.
  if (quick)
    return (
      <div className="mt-4 space-y-4">
        {notices}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold">Ready to send</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-stone-500">When</dt>
            <dd>
              {dateLine}, {f.start}
              {f.end ? `–${f.end}` : ""}
            </dd>
            <dt className="text-stone-500">Where</dt>
            <dd>{f.place}</dd>
            <dt className="text-stone-500">People</dt>
            <dd>About {f.number}</dd>
            <dt className="text-stone-500">From</dt>
            <dd>
              {f.name}, {f.capacity.split(",")[0]}
            </dd>
            <dt className="text-stone-500">To</dt>
            <dd>
              {authority.email}{" "}
              <span className="text-stone-500">(you&apos;re CC&apos;d)</span>
            </dd>
          </dl>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <button
              type="button"
              onClick={showPreview}
              className="font-medium text-pink-ink hover:underline"
            >
              Preview the form
            </button>
            <button
              type="button"
              onClick={() => setQuick(false)}
              className="text-stone-500 hover:text-stone-800 hover:underline"
            >
              Change something
            </button>
            <button
              type="button"
              disabled={busy || !sigBytes}
              onClick={() => send(true)}
              className="text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
            >
              Send me a test
            </button>
          </div>
          {preview && (
            <iframe
              src={preview}
              title="Form preview"
              className="mt-3 h-[60vh] w-full rounded-xl bg-white ring-1 ring-black/10"
            />
          )}
        </section>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {status && (
          <p className="rounded-2xl bg-cyan/20 px-4 py-3 text-sm text-navy">
            {status}
          </p>
        )}
        {!done && (
          <button
            type="button"
            disabled={busy || !sigBytes}
            onClick={() => send(false)}
            className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send to the police"}
          </button>
        )}
      </div>
    );

  return (
    <div className="mt-4 space-y-6">
      {notices}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Your details</h2>
          {!editMine && (
            <button
              type="button"
              onClick={() => setEditMine(true)}
              className="text-xs text-stone-500 hover:text-stone-800 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500">
          Only you can see these. They&apos;re used on your forms only.
        </p>
        {editMine ? (
          <div className="mt-3 space-y-3">
            {field("name")}
            {field("address")}
            <div className="grid grid-cols-2 gap-3">
              {field("postcode")}
              {field("phone")}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-stone-700">
                Your signature
                {sigBytes && !newSig && (
                  <span className="font-normal text-stone-500">
                    {" "}
                    (saved; draw again to replace it)
                  </span>
                )}
              </p>
              <SignaturePad onChange={setNewSig} />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={saveMine}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save my details
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-700">
            {f.name} · {f.address} {f.postcode} · {f.phone} · signature saved ✓
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold">The event</h2>
        <p className="text-xs text-stone-500">
          Filled in from the event. Change anything that&apos;s different.
        </p>
        <div className="mt-3 space-y-3">
          {field("place")}
          <div className="grid grid-cols-3 gap-3">
            {field("number")}
            {field("start")}
            {field("end")}
          </div>
          {field("purpose", true)}
          {field("special", true)}
          {field("capacity")}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold">The email</h2>
        <p className="mt-1 text-sm text-stone-600">
          To <b>{authority.email}</b> ({authority.name}), CC you. Replies come
          to you.
        </p>
        <label className="mt-3 block text-sm font-medium text-stone-700">
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-stone-700">
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className={`${inputClass} mt-1 font-normal`}
          />
        </label>
        <p className="mt-1 text-xs text-stone-500">Attached: {filename}</p>
      </section>

      <section>
        <button
          type="button"
          onClick={showPreview}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white"
        >
          Preview the form
        </button>
        {preview && (
          <div className="mt-3">
            <iframe
              src={preview}
              title="Form preview"
              className="h-[70vh] w-full rounded-xl bg-white ring-1 ring-black/10"
            />
            <a
              href={preview}
              target="_blank"
              rel="noopener"
              className="mt-1 inline-block text-xs text-stone-500 hover:underline"
            >
              Open the PDF in a new tab
            </a>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {status && (
        <p className="rounded-2xl bg-cyan/20 px-4 py-3 text-sm text-navy">
          {status}
        </p>
      )}

      {!done && (
        <div className="flex flex-wrap gap-2">
          {confirming ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => send(false)}
                className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                {busy ? "Sending…" : `Yes, send to ${authority.email}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-xl px-4 py-3 text-sm text-stone-600 hover:text-stone-900"
              >
                Not yet
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(true)}
                className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                Send to the police
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => send(true)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send me a test"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
