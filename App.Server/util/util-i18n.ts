export type Language = 'en' | 'de';

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
