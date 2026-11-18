import { Star } from "lucide-react";

/** Note en étoiles (lecture seule), demi-étoiles arrondies à l'étoile la plus proche. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toLocaleString("fr-FR")} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= full ? "fill-amber-400 text-amber-400" : "text-white/20"} aria-hidden />
      ))}
    </span>
  );
}
