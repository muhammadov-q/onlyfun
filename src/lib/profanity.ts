// ─── Profanity filter for EN + RU ─────────────────────────────────────────────
// Checks if text contains blocked words. Uses normalized lowercase matching
// with word-boundary awareness to reduce false positives.

const EN_WORDS = [
  // Slurs & hate
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
  "tranny",
  "chink",
  "spic",
  "kike",
  "coon",
  "wetback",
  "beaner",
  // Sexual
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "cock",
  "cunt",
  "whore",
  "slut",
  "bastard",
  "motherfucker",
  "blowjob",
  "handjob",
  "dildo",
  "porn",
  "hentai",
  "nude",
  "nudes",
  "naked",
  // Violence / threats
  "kill yourself",
  "kys",
  "go die",
  "suicide",
  "bomb threat",
  // Drugs
  "cocaine",
  "heroin",
  "meth",
];

const RU_WORDS = [
  // Мат (Russian profanity)
  "блядь",
  "бля",
  "блять",
  "сука",
  "ебать",
  "ёб",
  "ебал",
  "ебан",
  "ебаный",
  "ебанутый",
  "ебашить",
  "ебло",
  "ёбаный",
  "хуй",
  "хуя",
  "хуе",
  "хуёвый",
  "хуйня",
  "пизда",
  "пиздец",
  "пиздёж",
  "пизд",
  "пиздатый",
  "пиздос",
  "залупа",
  "мудак",
  "мудила",
  "ёбтвоюмать",
  "нахуй",
  "нахуя",
  "похуй",
  "пох",
  "заебал",
  "заебись",
  "отъебись",
  "уёбок",
  "уебок",
  "уёбище",
  "долбоёб",
  "долбоеб",
  "ебанат",
  "пидор",
  "пидорас",
  "пидр",
  "педик",
  "гандон",
  "шлюха",
  "шалава",
  "дрочить",
  "дрочка",
  "жопа",
  "срать",
  "срань",
  "говно",
  "ублюдок",
  "тварь",
  "падла",
  "сволочь",
  // Drugs
  "наркотик",
  "героин",
  "кокаин",
  // Threats
  "убей себя",
  "сдохни",
];

// Normalize: lowercase, replace ё→е, strip zero-width chars and repeated chars
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/(.)\1{2,}/g, "$1$1"); // collapse "fuuuck" → "fuuck"
}

// Build regex patterns with word-boundary-like matching
// For short words (<=3 chars) require word boundaries to avoid false positives
// For longer words use substring matching
function buildPatterns(words: string[]): RegExp[] {
  return words.map((w) => {
    const escaped = normalize(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Allow optional spaces/dots/dashes between chars (bypasses "f u c k", "f.u.c.k")
    const spaced = escaped.split("").join("[\\s.\\-_*]*");
    if (w.length <= 3) {
      return new RegExp(`(?:^|[\\s,.!?;:()\\[\\]{}])${spaced}(?:$|[\\s,.!?;:()\\[\\]{}])`, "i");
    }
    return new RegExp(spaced, "i");
  });
}

const EN_PATTERNS = buildPatterns(EN_WORDS);
const RU_PATTERNS = buildPatterns(RU_WORDS);
const ALL_PATTERNS = [...EN_PATTERNS, ...RU_PATTERNS];

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return ALL_PATTERNS.some((p) => p.test(normalized));
}

export function getProfanityMatch(text: string): string | null {
  const normalized = normalize(text);
  for (let i = 0; i < ALL_PATTERNS.length; i++) {
    if (ALL_PATTERNS[i].test(normalized)) {
      const words = [...EN_WORDS, ...RU_WORDS];
      return words[i];
    }
  }
  return null;
}
