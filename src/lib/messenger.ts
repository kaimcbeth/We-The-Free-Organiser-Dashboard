// facebook.com/nathan.tran.832711 -> https://m.me/nathan.tran.832711
// facebook.com/profile.php?id=1000123 -> https://m.me/1000123
export function messengerLink(facebookUrl: string | null | undefined) {
  if (!facebookUrl) return null;
  try {
    const u = new URL(facebookUrl);
    if (!/(^|\.)facebook\.com$/i.test(u.hostname)) return null;
    const id = u.searchParams.get("id");
    if (u.pathname.startsWith("/profile.php") && id)
      return `https://m.me/${id}`;
    const name = u.pathname.split("/").filter(Boolean)[0];
    return name ? `https://m.me/${name}` : null;
  } catch {
    return null;
  }
}

// Tidy what people paste: add https://, drop tracking bits.
export function cleanFacebookUrl(raw: string) {
  let s = raw.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/(^|\.)facebook\.com$/i.test(u.hostname)) return null;
    const id = u.searchParams.get("id");
    u.protocol = "https:";
    u.hostname = "www.facebook.com";
    u.hash = "";
    u.search = u.pathname.startsWith("/profile.php") && id ? `?id=${id}` : "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
