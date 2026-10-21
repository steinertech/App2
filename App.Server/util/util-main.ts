import { userSession } from './util-user.js';
import { type AlertDto, AlertEnum } from '../dto/shared/alert-dto.js';
import type { ApiResponseDto } from '../dto/shared/api-response-dto.js';
import type { ApiRequestDto, Language } from '../dto/shared/api-request-dto.js';
import { languageFromRequest } from './util-i18n.js';

export const VERSION_SERVER = '1.20';

export function domainName(request: Request): string {
  const originHeader = request.headers.get('origin');
  if (originHeader) return new URL(originHeader).hostname;
  const refererHeader = request.headers.get('referer');
  if (refererHeader) return new URL(refererHeader).hostname;
  return 'unknown';
}

async function sectorKey(request: Request, isProject: boolean = true): Promise<string> {
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

/** sectorKey(request, false) plus "Type/<type>/", type being the name of a DbDto derived interface (e.g. 'UserDto'; interfaces don't exist at runtime, so it is passed by name). */
export async function sectorKeyDb(request: Request, type: string): Promise<string> {
  return (await sectorKey(request, false)) + 'Type' + '/' + type + '/';
}

/** sectorKey(request, true) plus "Type/<type>/", type being the name of a DbDto derived interface (e.g. 'PropertyDto'). Requires sign-in and a selected project like sectorKey. */
export async function sectorKeyProjectDb(request: Request, type: string): Promise<string> {
  return (await sectorKey(request, true)) + 'Type' + '/' + type + '/';
}

/** sectorKey(request, false) plus "Storage/", the path prefix of global blobs. */
export async function sectorKeyStorage(request: Request): Promise<string> {
  return (await sectorKey(request, false)) + 'Storage' + '/';
}

/** sectorKey(request, true) plus "Storage/", the path prefix of project blobs. Requires sign-in and a selected project like sectorKey. */
export async function sectorKeyProjectStorage(request: Request): Promise<string> {
  return (await sectorKey(request, true)) + 'Storage' + '/';
}

export function titleCase(text?: string): string | undefined {
  if (text === undefined) return undefined;
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Zero based column index to Excel column name (0 → A, 25 → Z, 26 → AA, 51 → AZ). */
export function indexToColumnNameExcel(value: number): string {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid column index ${value}!`);
  let result = '';
  for (let index = value + 1; index > 0; index = Math.floor((index - 1) / 26)) {
    result = String.fromCharCode(65 + ((index - 1) % 26)) + result;
  }
  return result;
}

/** Excel column name to zero based column index (A → 0, Z → 25, AA → 26, AZ → 51). Case insensitive. */
export function indexFromColumnNameExcel(value: string): number {
  if (!/^[A-Za-z]+$/.test(value)) throw new Error(`Invalid column name ${value}!`);
  let result = 0;
  for (const char of value.toUpperCase()) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }
  return result - 1;
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

const alertListByRequest = new WeakMap<Request, AlertDto[]>();

/** Queues an alert message; apiHandler sends it to App.Web (ApiResponseDto.alerts), which shows it in NavState. Works from any api/ endpoint. */
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

const requestDtoByRequest = new WeakMap<Request, ApiRequestDto<unknown>>();

/** The endpoint's own request DTO (ApiRequestDto.data) of a POST request, parsed by apiHandler. Use it instead of request.json(). */
export function requestData<T>(request: Request): T {
  const requestDto = requestDtoByRequest.get(request);
  if (requestDto === undefined) throw new Error('Request has no body!');
  return requestDto.data as T;
}

/** App.Web's current language: ApiRequestDto.language, or the Accept-Language header if the request has no body. */
export function requestLanguage(request: Request): Language {
  return requestDtoByRequest.get(request)?.language ?? languageFromRequest(request);
}

/** Result of a handler; apiHandler sends `data` as ApiResponseDto.data, together with the queued alerts and redirect url. */
export interface ApiResult {
  data: unknown;
  status: number;
  headers: Record<string, string>;
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): ApiResult {
  return { data, status, headers };
}

/**
 * Wraps an api/ endpoint: answers OPTIONS with 204, rejects every method other than `method` with 405,
 * turns a thrown error into a 500 with an Error alert and merges corsHeaders into the response.
 * A POST body is parsed as ApiRequestDto (handlers read it via requestData), adding a Warning alert if its versionClient differs from VERSION_SERVER.
 * A handler's jsonResponse(data, ...) is sent as an ApiResponseDto, which also carries the alerts queued via alertAdd
 * and the url set via redirectSet, and echoes the request's requestCount as responseCount. A handler returning a plain Response (e.g. text) sends it as is, without alerts or redirect url.
 * Export the result as the file's default.
 */
export function apiHandler(method: ApiMethod, handler: (request: Request) => Response | ApiResult | Promise<Response | ApiResult>) {
  return {
    async fetch(request: Request): Promise<Response> {
      const cors = corsHeaders(request, method);
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
      }
      if (request.method !== method) {
        return new Response(null, { status: 405, headers: { allow: `OPTIONS, ${method}`, ...cors } });
      }
      let result: Response | ApiResult;
      try {
        if (method === 'POST') {
          const requestDto: ApiRequestDto<unknown> = await request.json();
          requestDtoByRequest.set(request, requestDto);
          if (requestDto.versionClient !== VERSION_SERVER) {
            alertAdd(request, AlertEnum.Warning, 'A new version is available, please reload the page.');
          }
        }
        result = await handler(request);
      } catch (error) {
        // Logged for Vercel's function logs; the message reaches App.Web as an Error alert.
        console.error(error);
        alertAdd(request, AlertEnum.Error, error instanceof Error ? error.message : String(error));
        result = jsonResponse(null, 500);
      }
      let response: Response;
      if (result instanceof Response) {
        response = result;
      } else {
        const body: ApiResponseDto<unknown> = { data: result.data ?? null };
        const alertList = alertListByRequest.get(request);
        if (alertList?.length) {
          body.alerts = alertList;
        }
        const redirectUrl = redirectUrlByRequest.get(request);
        if (redirectUrl !== undefined) {
          body.redirectUrl = redirectUrl;
        }
        const requestCount = requestDtoByRequest.get(request)?.requestCount;
        if (requestCount !== undefined) {
          body.responseCount = requestCount;
        }
        response = new Response(JSON.stringify(body), {
          status: result.status,
          headers: { 'content-type': 'application/json', ...result.headers },
        });
      }
      for (const [name, value] of Object.entries(cors)) {
        response.headers.set(name, value);
      }
      return response;
    },
  };
}
