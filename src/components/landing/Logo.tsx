import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Swell — accueil">
      <Image src="/swell-mark.png" alt="" width={347} height={314} priority className="h-7 w-auto" />
      <span className="font-display text-lg font-extrabold tracking-[0.12em]">SWELL</span>
    </Link>
  );
}
