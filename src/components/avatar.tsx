// Round profile photo, or initials when there isn't one.
export function Avatar({
  name,
  url,
  size = 40,
  className = "",
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.38),
  };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={style}
        className={`shrink-0 rounded-full object-cover ring-1 ring-black/10 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-navy-2 font-semibold text-white ${className}`}
    >
      {initials}
    </span>
  );
}
