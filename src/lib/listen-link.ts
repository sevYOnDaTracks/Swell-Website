// Nom de la plateforme d'écoute à partir d'un lien (utilisable côté client).
const PLATFORMS: [RegExp, string][] = [
  [/(^|\.)spotify\.com$/, "Spotify"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)soundcloud\.com$/, "SoundCloud"],
  [/(^|\.)music\.apple\.com$/, "Apple Music"],
  [/(^|\.)deezer\.com$/, "Deezer"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
];

export function platformName(link: string) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return PLATFORMS.find(([re]) => re.test(host))?.[1] ?? host;
  } catch {
    return "Écouter";
  }
}
