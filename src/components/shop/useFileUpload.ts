"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Envoi direct d'un fichier vers une route (PUT) avec progression, puis rafraîchit la page. */
export function useFileUpload(url: string) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upload(file: File, headers: Record<string, string> = {}) {
    setError(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) return router.refresh();
      try {
        setError(JSON.parse(xhr.responseText).error ?? "L'envoi a échoué.");
      } catch {
        setError(xhr.status === 413 ? "Fichier trop lourd." : "L'envoi a échoué.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Connexion interrompue pendant l'envoi.");
    };
    xhr.send(file);
  }

  return { progress, error, upload };
}
