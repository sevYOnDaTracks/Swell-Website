/** Photo de profil, ou initiales sur fond gris à défaut. */
export function Avatar({ name, image, size = 36 }: { name: string; image?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- photo envoyée par l'utilisateur ou fournie par Google
    <img src={image} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-foreground"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}
