import { Paperclip } from "lucide-react";

type Message = { id: string; author: "client" | "admin"; body: string; attachment: string | null; createdAt: Date };

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Fil d'une demande de support : les messages du client et de Swell, avec leurs pièces jointes. */
export function TicketThread({ messages, clientName, token, viewer }: { messages: Message[]; clientName: string; token?: string; viewer: "client" | "admin" }) {
  return (
    <ol className="space-y-3">
      {messages.map((m) => {
        const mine = m.author === viewer;
        const fromSwell = m.author === "admin";
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${fromSwell ? "bg-white text-black" : "border border-white/10 bg-surface"}`}>
              <p className={`text-xs ${fromSwell ? "text-black/60" : "text-muted"}`}>
                <span className="font-semibold">{fromSwell ? "Swell" : clientName}</span> · {when.format(m.createdAt)}
              </p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{m.body}</p>
              {m.attachment && (
                <a
                  href={`/api/support/attachments/${m.id}${token ? `?t=${token}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${fromSwell ? "bg-black/10" : "bg-white/10"}`}
                >
                  <Paperclip size={13} /> Pièce jointe
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
