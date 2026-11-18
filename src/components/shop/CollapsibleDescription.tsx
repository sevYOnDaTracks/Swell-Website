"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const COLLAPSED_HEIGHT = 168; // ~6 lignes

/** Description longue repliée par défaut. Le texte complet reste dans le HTML (lisible par Google). */
export function CollapsibleDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [long, setLong] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setLong(el.scrollHeight > COLLAPSED_HEIGHT + 48);
  }, [text]);

  const collapsed = long && !open;
  return (
    <div className="mt-6 max-w-3xl">
      <div className="relative">
        <p
          ref={ref}
          className="overflow-hidden whitespace-pre-line text-[15px] leading-relaxed text-foreground/80"
          style={collapsed ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
        >
          {text}
        </p>
        {collapsed && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
        >
          {open ? "Réduire" : "Lire la suite"}
          <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      )}
    </div>
  );
}
