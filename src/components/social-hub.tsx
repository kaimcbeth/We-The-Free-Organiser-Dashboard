"use client";

import { SaveToPlanner } from "@/components/save-to-planner";
import { useEffect, useState } from "react";
import { zipSync } from "fflate";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/form";
import { Sheet } from "@/components/sheet";
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

      <p className="text-xs text-stone-500">
        Tip: post it as your own (not a repost) so it shows on your grid, and
        keep the local line in the caption. Instagram treats changed posts as
        new, so they still reach people who don&apos;t follow you yet.
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SOCIAL_POSTS.map((p) => (
          <PostTile
            key={p.slug}
            teamId={teamId}
            post={p}
            handle={handle}
            community={community}
          />
        ))}
      </ul>
    </div>
  );
}

// A cover in the grid; tap to open the post (slides, caption, buttons).
function PostTile({
  teamId,
  post,
  handle,
  community,
}: {
  teamId: string | null;
  post: SocialPost;
  handle: string | null;
  community: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-left"
      >
        <span className="relative block overflow-hidden rounded-xl ring-1 ring-black/5 group-hover:ring-2 group-hover:ring-pink">
          {/* eslint-disable-next-line @next/next/no-img-element -- static cover */}
          <img
            src={slideUrl(post, 1)}
            alt=""
            loading="lazy"
            className="aspect-[4/5] w-full object-cover"
          />
          {post.slides > 1 && (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-navy/80 px-2 py-0.5 text-[11px] font-semibold text-white">
              1/{post.slides}
            </span>
          )}
        </span>
        <span className="mt-1.5 line-clamp-2 block text-sm font-medium leading-snug text-navy">
          {post.title}
        </span>
      </button>
      {open && (
        <Sheet title={post.title} onClose={() => setOpen(false)}>
          <PostCard
            teamId={teamId}
            post={post}
            handle={handle}
            community={community}
          />
        </Sheet>
      )}
    </li>
  );
}

export function PostCard({
  teamId,
  post,
  handle,
  community,
}: {
  teamId?: string | null; // offers Save to planner
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
        setNote("Caption copied too: paste it in when Instagram asks for one.");
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
    if (f.length === 1) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f[0]);
      a.download = f[0].name;
      a.click();
      setBusy("");
      return;
    }
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
    <div>
      <p className="text-xs text-stone-500">
        {post.slides > 1 ? `Carousel · ${post.slides} slides` : "Single image"}
      </p>
      <div className="-mx-5 mt-2 flex snap-x gap-2 overflow-x-auto px-5 pb-2">
        {Array.from({ length: post.slides }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- generated slides
          <img
            key={i}
            src={urls[i] ?? slideUrl(post, i + 1)}
            alt={`Slide ${i + 1}`}
            className={`${post.slides > 1 ? "h-52" : "h-72"} w-auto shrink-0 snap-start rounded-lg ring-1 ring-black/5`}
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
          rows={6}
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
          {busy === "download"
            ? "Getting it ready…"
            : post.slides > 1
              ? "Download all"
              : "Download"}
        </button>
      </div>
      {teamId && (
        <div className="mt-2">
          <SaveToPlanner
            teamId={teamId}
            note={post.title}
            caption={caption}
            platforms={["instagram"]}
            getImages={() =>
              Promise.all(
                Array.from({ length: post.slides }, (_, i) =>
                  renderSlide(post, i + 1, name),
                ),
              )
            }
            className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
          />
        </div>
      )}
      {note && <p className="mt-2 text-sm text-stone-600">{note}</p>}
    </div>
  );
}
