import { userSession } from './util-user.js';

export const VERSION_SERVER = '1.18';

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
    // SessionDto.projectName mirrors UserDto.projectName (copied on login, kept in sync by userProject).
    if (!dto.projectName) throw new Error('User has no project selected!');
    return 'Domain' + '/' + domainName(request) + '/' + 'Project' + '/' + dto.projectName + '/';
  }
  return 'Domain' + '/' + domainName(request) + '/' + 'Global' + '/';
}

export function titleCase(text?: string): string | undefined {
  if (text === undefined) return undefined;
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export type ApiMethod = 'GET' | 'POST';

export function corsHeaders(request: Request, method: ApiMethod): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': `OPTIONS, ${method}`,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Wraps an api/ endpoint: answers OPTIONS with 204, rejects every method other than `method` with 405,
 * and merges corsHeaders into the handler's response. Export the result as the file's default.
 */
export function apiHandler(method: ApiMethod, handler: (request: Request) => Response | Promise<Response>) {
  return {
    async fetch(request: Request): Promise<Response> {
      const cors = corsHeaders(request, method);
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
      }
      if (request.method !== method) {
        return new Response(null, { status: 405, headers: { allow: `OPTIONS, ${method}`, ...cors } });
      }
      const response = await handler(request);
      for (const [name, value] of Object.entries(cors)) {
        response.headers.set(name, value);
      }
      return response;
    },
  };
}
