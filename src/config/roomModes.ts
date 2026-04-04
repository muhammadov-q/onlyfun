import type { RoomMode } from "@/types/room";

export const ROOM_MODES: RoomMode[] = [
  {
    id: "debate",
    label: "Debate",
    labelRu: "Дебаты",
    emoji: "\u{1F525}",
    description: "Opinionated & controversial",
    descriptionRu: "Спорные мнения и горячие темы",
  },
  {
    id: "chill",
    label: "Chill",
    labelRu: "Чилл",
    emoji: "\u{1F33F}",
    description: "Easy & relaxed",
    descriptionRu: "Лёгкая и расслабленная атмосфера",
  },
  {
    id: "confessions",
    label: "Confessions",
    labelRu: "Признания",
    emoji: "\u{1F648}",
    description: "Personal & honest",
    descriptionRu: "Личное и честное",
  },
  {
    id: "business",
    label: "Business",
    labelRu: "Бизнес",
    emoji: "\u{1F4BC}",
    description: "Career, money & ideas",
    descriptionRu: "Карьера, деньги и идеи",
  },
  {
    id: "funny",
    label: "Funny",
    labelRu: "Угар",
    emoji: "\u{1F602}",
    description: "Playful & absurd",
    descriptionRu: "Весёлое и абсурдное",
  },
  {
    id: "advice",
    label: "Advice",
    labelRu: "Советы",
    emoji: "\u{1F4AC}",
    description: "Helpful & supportive",
    descriptionRu: "Полезные советы и поддержка",
  },
  {
    id: "deep",
    label: "Deep",
    labelRu: "Глубокое",
    emoji: "\u{1F30C}",
    description: "Philosophical & meaningful",
    descriptionRu: "Философское и глубокое",
  },
  {
    id: "night",
    label: "Night",
    labelRu: "Ночной",
    emoji: "\u{1F319}",
    description: "Late-night & chaotic",
    descriptionRu: "Ночные рандомные разговоры",
  },
];

export const ROOM_MODES_MAP = Object.fromEntries(ROOM_MODES.map((m) => [m.id, m])) as Record<
  string,
  RoomMode
>;
