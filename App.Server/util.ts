export const VERSION_SERVER = '1.13';

export function domainName(request: Request): string {
  const originHeader = request.headers.get('origin');
  return originHeader ? new URL(originHeader).hostname : 'unknown';
}
