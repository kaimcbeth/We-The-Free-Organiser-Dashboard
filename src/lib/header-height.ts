// The height of the page's sticky header (if any), kept up to date. Use with
// useSyncExternalStore(subscribeHeader, readHeader, () => 0).
export function readHeader() {
  const h = document.querySelector("header");
  return h && getComputedStyle(h).position === "sticky" ? h.offsetHeight : 0;
}
export function subscribeHeader(cb: () => void) {
  const h = document.querySelector("header");
  const ro = h ? new ResizeObserver(cb) : null;
  if (h) ro?.observe(h);
  window.addEventListener("resize", cb);
  return () => {
    ro?.disconnect();
    window.removeEventListener("resize", cb);
  };
}
