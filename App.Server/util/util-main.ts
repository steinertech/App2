import { userSession } from './util-user.ts';

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

export function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
