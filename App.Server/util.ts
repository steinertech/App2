export const VERSION_SERVER = '1.14';

export function domainName(request: Request): string {
  const originHeader = request.headers.get('origin');
  return originHeader ? new URL(originHeader).hostname : 'unknown';
}

export function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
