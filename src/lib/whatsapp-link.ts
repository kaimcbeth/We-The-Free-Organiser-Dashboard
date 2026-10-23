// Phone numbers are stored as typed (0412 345 678); WhatsApp needs the country code.
export function waLink(phone: string | null, tz: string) {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("0")) {
    const cc = tz.startsWith("Australia/")
      ? "61"
      : tz === "Pacific/Auckland"
        ? "64"
        : tz.startsWith("America/")
          ? "1"
          : "";
    if (!cc) return null;
    digits = cc + digits.slice(1);
  }
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
