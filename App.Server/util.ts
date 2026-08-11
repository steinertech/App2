export const VERSION_SERVER = '1.14';

export function domainName(request: Request): string {
  const originHeader = request.headers.get('origin');
  if (originHeader) return new URL(originHeader).hostname;
  const refererHeader = request.headers.get('referer');
  if (refererHeader) return new URL(refererHeader).hostname;
  return 'unknown';
}

export function sectorKey(request: Request, isProject: boolean = true): string {
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
