import Link from "next/link";
import { ChevronRight, Download, FileAudio } from "lucide-react";
import { formatBytes } from "@/lib/shop-format";
import type { SessionFileInfo } from "@/lib/session-files";

/** Fichiers rendus par Swell après la séance, téléchargeables par le client. */
export function SessionFileList({ files }: { files: SessionFileInfo[] | undefined }) {
  if (!files?.length) return null;
  return (
    <div className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">
          Tes fichiers · {files.length} fichier{files.length > 1 ? "s" : ""}
        </p>
        <Link href="/compte/sons" className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-foreground">
          Écouter dans Mes sons <ChevronRight size={13} />
        </Link>
      </div>
      <ul className="mt-2 space-y-1">
        {files.map((f) => (
          <li key={f.id}>
            <a
              href={`/api/seances/fichiers/${f.id}`}
              className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
            >
              <FileAudio size={15} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted">{formatBytes(f.size)}</span>
              <Download size={14} className="shrink-0 text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
