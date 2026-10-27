import type { Language } from '../../dto/shared/api-request-dto.js';

export type { Language };

/** Language from the Accept-Language header; prefer requestLanguage(request) (util-main.ts), which uses ApiRequestDto.language first. */
export function languageFromRequest(request: Request): Language {
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  return acceptLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}

const textTranslations: Record<Language, string> = {
  en: 'Hello World',
  de: 'Hallo Welt',
};

export function translateText(language: Language): string {
  return textTranslations[language];
}
