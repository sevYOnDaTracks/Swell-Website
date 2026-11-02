import {
  AudioWaveform,
  Disc3,
  Drum,
  Headphones,
  Mic,
  Music,
  Piano,
  Plug,
  SlidersHorizontal,
  Speaker,
} from "lucide-react";

// Icônes proposées pour les services dans l'admin.
export const SERVICE_ICONS = {
  sliders: { label: "Console", Icon: SlidersHorizontal },
  music: { label: "Note", Icon: Music },
  mic: { label: "Micro", Icon: Mic },
  plug: { label: "Prise", Icon: Plug },
  headphones: { label: "Casque", Icon: Headphones },
  disc: { label: "Disque", Icon: Disc3 },
  piano: { label: "Piano", Icon: Piano },
  drum: { label: "Batterie", Icon: Drum },
  wave: { label: "Onde", Icon: AudioWaveform },
  speaker: { label: "Enceinte", Icon: Speaker },
} as const;

export type ServiceIcon = keyof typeof SERVICE_ICONS;

export function serviceIcon(name: string) {
  return (SERVICE_ICONS[name as ServiceIcon] ?? SERVICE_ICONS.sliders).Icon;
}
