import { userSession } from './util-user.js';
import { ALERT_HEADER, type AlertDto, AlertEnum } from '../dto/shared/alert-dto.js';
import { REDIRECT_HEADER } from '../dto/shared/redirect-dto.js';

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
    if (!dto) {
      redirectSet(request, '/sign-in');
      throw new Error('User not signed in!');
    }
    // SessionDto.projectName mirrors UserDto.projectName (copied on sign-in, kept in sync by userProject).
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
    'Access-Control-Expose-Headers': `${ALERT_HEADER}, ${REDIRECT_HEADER}`,
  };
}

const alertListByRequest = new WeakMap<Request, AlertDto[]>();

/** Queues an alert message; apiHandler sends it to App.Web, which shows it in NavState. Works from any api/ endpoint. */
export function alertAdd(request: Request, alertEnum: AlertEnum, text: string) {
  const alertList = alertListByRequest.get(request) ?? [];
  alertList.push({ alertEnum, text });
  alertListByRequest.set(request, alertList);
}

const redirectUrlByRequest = new WeakMap<Request, string>();

/**
 * Sets the ONE url App.Web navigates to after this request (a later call overwrites an earlier one); apiHandler sends it.
 * `url` is a language neutral App.Web path such as '/' (App.Web adds the current language prefix).
 */
export function redirectSet(request: Request, url: string) {
  redirectUrlByRequest.set(request, url);
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Wraps an api/ endpoint: answers OPTIONS with 204, rejects every method other than `method` with 405,
 * merges corsHeaders into the handler's response, turns a thrown error into a 500 with an Error alert, sends alerts queued via alertAdd in the ALERT_HEADER
 * and the url set via redirectSet in the REDIRECT_HEADER.
 * Export the result as the file's default.
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
      let response: Response;
      try {
        response = await handler(request);
      } catch (error) {
        // Logged for Vercel's function logs; the message reaches App.Web as an Error alert.
        console.error(error);
        alertAdd(request, AlertEnum.Error, error instanceof Error ? error.message : String(error));
        response = jsonResponse(null, 500);
      }
      for (const [name, value] of Object.entries(cors)) {
        response.headers.set(name, value);
      }
      const alertList = alertListByRequest.get(request);
      if (alertList?.length) {
        response.headers.set(ALERT_HEADER, encodeURIComponent(JSON.stringify(alertList)));
      }
      const redirectUrl = redirectUrlByRequest.get(request);
      if (redirectUrl !== undefined) {
        response.headers.set(REDIRECT_HEADER, encodeURIComponent(redirectUrl));
      }
      return response;
    },
  };
}
