// Download each file on its own, never a zip (Kai, 19 Nov 2026: "Can we not
// download as zip"): on a phone each slide lands in the gallery's Download
// album, where Instagram's picker can find it. Browsers may ask once to allow
// several downloads.
export async function saveFiles(files: File[]) {
  for (const [i, f] of files.entries()) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 20_000);
    if (i < files.length - 1) await new Promise((r) => setTimeout(r, 400));
  }
}
