import type { Language } from '../../../App.Server/dto/shared/api-request-dto.ts';

export type { Language };

export function languageFromPathname(pathname: string): Language {
  return pathname === '/de' || pathname.startsWith('/de/') ? 'de' : 'en';
}

export function stripLanguagePrefix(pathname: string): string {
  if (pathname === '/de') return '/';
  if (pathname.startsWith('/de/')) return pathname.slice(3);
  return pathname;
}

export function withLanguagePrefix(pathname: string, language: Language): string {
  const bare = stripLanguagePrefix(pathname);
  if (language === 'en') return bare;
  return bare === '/' ? '/de' : `/de${bare}`;
}
