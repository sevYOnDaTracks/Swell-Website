import { db } from "@/db";
import { reviewRequest } from "@/db/schema";
import { SITE_URL, sendEmail } from "@/lib/email";
import { getDueReviewRequests } from "@/lib/reviews";

// Demande d'avis : 10 jours après un achat payé, 5 jours après le début d'une démo.
// Un seul email par client et par produit. Appelée une fois par jour par le cron du serveur
// avec l'en-tête Authorization: Bearer <CRON_SECRET>.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Accès refusé", { status: 401 });
  }

  const due = await getDueReviewRequests();
  for (const r of due) {
    // Noté avant l'envoi : un plantage au milieu ne renvoie jamais deux fois le même email.
    await db.insert(reviewRequest).values({ userId: r.userId, productId: r.productId }).onConflictDoNothing();
    const firstName = r.name.trim().split(/\s+/)[0] || "";
    await sendEmail({
      to: r.email,
      subject: `Ton avis sur ${r.productName} ?`,
      title: `Que penses-tu de ${r.productName} ?`,
      paragraphs: [
        `Salut ${firstName},`,
        r.kind === "trial"
          ? `Tu testes ${r.productName} depuis quelques jours. Ton retour, positif ou non, aide les autres musiciens à savoir si ce plugin est fait pour eux.`
          : `Tu utilises ${r.productName} depuis quelques jours. Ton retour, positif ou non, aide les autres musiciens à choisir, et nous aide à améliorer le plugin.`,
        "Ça prend une minute : une note, quelques mots, et si tu veux ton DAW et ton système.",
      ],
      cta: { label: "Laisser mon avis", href: `${SITE_URL}/boutique/${r.slug}#avis` },
    });
  }
  return Response.json({ sent: due.length });
}
