import { userSession } from './util-user.js';

export const VERSION_SERVER = '1.15';

export function domainName(request: Request): string {
  const originHeader = request.headers.get('origin');
  if (originHeader) return new URL(originHeader).hostname;
  const refererHeader = request.headers.get('referer');
  if (refererHeader) return new URL(refererHeader).hostname;
  return 'unknown';
}

export async function sectorKey(request: Request, isProject: boolean = true): Promise<string> {
  if (isProject) {
    const dto = await userSession(request);
    if (!dto) throw new Error('User not logged in!');
  }
  return 'Domain' + '/' + domainName(request) + '/' + (isProject ? 'Project' : 'Global') + '/';
}

export function titleCase(text?: string): string | undefined {
  if (text === undefined) return undefined;
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
