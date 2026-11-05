"use client";

import { useEffect, useState } from "react";
import { zipSync } from "fflate";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/form";
import { SOCIAL_POSTS, slideUrl, type SocialPost } from "@/lib/social-posts";

// Social Media Hub (Kai, 5 Nov 2026): main-page posts for communities to post
// on their own Instagram, with the community's @username on every slide.

const FONT = "WTF Poppins";
let fontLoad: Promise<unknown> | null = null;
function loadFont() {
  if (typeof document === "undefined") return Promise.resolve();
  fontLoad ??= new FontFace(FONT, "url(/fonts/poppins-regular.woff2)")
    .load()
    .then((f) => document.fonts.add(f))
    .catch(() => {});
  return fontLoad;
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

// One slide as a JPEG, with the username in the corner (or as it is).
async function renderSlide(
  post: SocialPost,
  n: number,
  handle: string | null,
): Promise<Blob> {
  const img = await loadImage(slideUrl(post, n));
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  if (handle) {
    await loadFont();
    const w = post.watermark;
    ctx.font = `400 ${w.size}px "${FONT}", "Poppins", sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`@${handle}`, w.x, w.baseline);
  }
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.92));
}

export function SocialHub({
  teamId,
  community,
  handle: initialHandle,
  canEditHandle,
}: {
  teamId: string | null;
  community: string;
  handle: string | null;
  canEditHandle: boolean; // organisers; Core Team see it only
}) {
  const [handle, setHandle] = useState(initialHandle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialHandle ?? "");
  const [msg, setMsg] = useState("");

  async function save() {
    if (!teamId) return;
    setMsg("");
    const v = draft.trim().replace(/^@/, "").toLowerCase();
    const { data } = await createClient().rpc("set_instagram_handle", {
      p_team_id: teamId,
      p_handle: v,
    });
    if (data === "bad")
      return setMsg("Letters, numbers, dots and underscores only.");
    if (data !== "ok") return setMsg("Couldn't save that. Please try again.");
    setHandle(v || null);
    setEditing(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        {editing ? (
          <div className="space-y-2">
            <label className="block font-medium text-stone-700">
              Your community&apos;s Instagram username
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="activism.wtf.yourcity"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={save}
                className="rounded-xl bg-navy px-3 py-1.5 font-semibold text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-stone-500 hover:underline"
              >
                Cancel
              </button>
            </div>
            {msg && <p className="text-red-700">{msg}</p>}
          </div>
        ) : handle ? (
          <p className="text-stone-600">
            Every slide gets <b className="text-navy">@{handle}</b> in the
            corner.
            {canEditHandle && (
              <button
                type="button"
                onClick={() => {
                  setDraft(handle);
                  setEditing(true);
                }}
                className="ml-2 text-xs text-stone-400 hover:text-navy hover:underline"
              >
                Change
              </button>
            )}
          </p>
        ) : canEditHandle ? (
          <p className="text-stone-600">
            Add your community&apos;s Instagram username and it goes in the
            corner of every slide.{" "}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-semibold text-pink-ink hover:underline"
            >
              Add username
            </button>
          </p>
        ) : (
          <p className="text-stone-600">
            Ask an organiser to add your community&apos;s Instagram username so
            it goes on every slide.
          </p>
        )}
      </div>

      <ul className="space-y-5">
        {SOCIAL_POSTS.map((p) => (
          <PostCard
            key={p.slug}
            post={p}
            handle={handle}
            community={community}
          />
        ))}
      </ul>
    </div>
  );
}

export function PostCard({
  post,
  handle,
  community,
}: {
  post: SocialPost;
  handle: string | null;
  community: string;
}) {
  const [withName, setWithName] = useState(true);
  const [urls, setUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState(
    post.caption.replaceAll("{community}", community || "your city"),
  );
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const name = withName ? handle : null;

  useEffect(() => {
    let live = true;
    const made: string[] = [];
    Promise.all(
      Array.from({ length: post.slides }, (_, i) =>
        renderSlide(post, i + 1, name),
      ),
    )
      .then((blobs) => {
        if (!live) return;
        for (const b of blobs) made.push(URL.createObjectURL(b));
        setUrls(made);
      })
      .catch(() => {});
    return () => {
      live = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [post, name]);

  const files = async () =>
    Promise.all(
      Array.from({ length: post.slides }, async (_, i) => {
        const b = await renderSlide(post, i + 1, name);
        return new File([b], `${post.slug}-${i + 1}.jpg`, {
          type: "image/jpeg",
        });
      }),
    );

  async function share() {
    setNote("");
    setBusy("share");
    try {
      const f = await files();
      if (navigator.canShare?.({ files: f })) {
        await navigator.clipboard.writeText(caption).catch(() => {});
        await navigator.share({ files: f });
        setNote(
          "Caption copied too: paste it in Instagram after you pick the slides' order.",
        );
      } else {
        await download(f);
        setNote(
          "Downloaded. On your phone, Share opens Instagram with all the slides.",
        );
      }
    } catch {
      // closed the share sheet
    }
    setBusy("");
  }

  async function download(given?: File[]) {
    setBusy("download");
    const f = given ?? (await files());
    const entries: Record<string, Uint8Array> = {};
    for (const x of f) entries[x.name] = new Uint8Array(await x.arrayBuffer());
    const zip = zipSync(entries, { level: 0 });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([zip as BlobPart], { type: "application/zip" }),
    );
    a.download = `${post.slug}.zip`;
    a.click();
    setBusy("");
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-navy">{post.title}</h3>
        <span className="text-xs text-stone-500">
          Carousel · {post.slides} slides
        </span>
      </div>
      <div className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
        {Array.from({ length: post.slides }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- generated slides
          <img
            key={i}
            src={urls[i] ?? slideUrl(post, i + 1)}
            alt={`Slide ${i + 1}`}
            className="h-56 w-auto shrink-0 snap-start rounded-lg ring-1 ring-black/5"
          />
        ))}
      </div>
      {handle && (
        <label className="mt-2 flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={withName}
            onChange={(e) => setWithName(e.target.checked)}
          />
          Add @{handle}
        </label>
      )}
      <label className="mt-3 block text-sm font-medium text-stone-700">
        Caption{" "}
        <span className="font-normal text-stone-400">
          (edit it to suit you)
        </span>
        <textarea
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            setCopied(false);
          }}
          rows={8}
          className="mt-1 w-full rounded-xl bg-white p-2 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={share}
          className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {busy === "share" ? "Getting slides…" : "Share to Instagram"}
        </button>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(caption)
              .then(() => setCopied(true))
              .catch(() =>
                setNote("Couldn't copy. Select the caption instead."),
              )
          }
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ${copied ? "bg-cyan" : "bg-navy/5 hover:bg-navy/10"}`}
        >
          {copied ? "Copied" : "Copy caption"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => download()}
          className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10 disabled:opacity-60"
        >
          {busy === "download" ? "Zipping…" : "Download all"}
        </button>
      </div>
      {note && <p className="mt-2 text-sm text-stone-600">{note}</p>}
      <p className="mt-3 text-xs text-stone-500">
        Tip: post it as your own (not a repost) so it shows on your grid, and
        keep the local line in the caption. Instagram treats changed posts as
        new, so they still reach people who don&apos;t follow you yet.
      </p>
    </li>
  );
}
