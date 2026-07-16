import type { LangCode, DictionaryKey } from "./types";
import { SUPPORTED_LANGS, LANG_LABELS } from "./types";
import { en } from "./en";
import { enSimple } from "./en-simple";
import { ta } from "./ta";
import { hi } from "./hi";
import { te } from "./te";
import { ml } from "./ml";

export { SUPPORTED_LANGS, LANG_LABELS };
export type { LangCode, DictionaryKey };

const DICTIONARIES = {
  en,
  "en-simple": enSimple,
  ta,
  hi,
  te,
  ml,
} as const;

export function getDictionary(lang: string | undefined | null) {
  const code = (SUPPORTED_LANGS as readonly string[]).includes(lang ?? "") ? (lang as LangCode) : "en";
  return DICTIONARIES[code];
}

export function translate(lang: string | undefined | null, key: DictionaryKey): string {
  const dict = getDictionary(lang);
  return dict[key] ?? DICTIONARIES.en[key] ?? key;
}
