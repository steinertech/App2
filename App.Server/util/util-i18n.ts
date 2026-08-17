export type Language = 'en' | 'de';

export function languageFromRequest(request: Request): Language {
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  return acceptLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}

const helloWorldTranslations: Record<Language, string> = {
  en: 'Hello World',
  de: 'Hallo Welt',
};

export function translateHelloWorld(language: Language): string {
  return helloWorldTranslations[language];
}
