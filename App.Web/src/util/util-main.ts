import { useEffect, useRef, type DependencyList } from 'react';
import { apiUrl } from '../page/App.tsx';
import { type AlertDto, AlertEnum } from '../../../App.Server/dto/shared/alert-dto.ts';
import type { ApiResponseDto } from '../../../App.Server/dto/shared/api-response-dto.ts';
import type { ApiRequestDto } from '../../../App.Server/dto/shared/api-request-dto.ts';
import { languageFromPathname } from './util-i18n.ts';

export const VERSION_CLIENT = '1.20';

/**
 * Like useEffect, but runs `effect` only once per distinct `deps` values. StrictMode runs every effect twice in dev,
 * which would send backend calls (e.g. grid-load, sign-out) twice; use this for effects that call the backend.
 */
export function useEffectOnce(effect: () => void, deps: DependencyList) {
  const lastDeps = useRef<DependencyList | undefined>(undefined);
  useEffect(() => {
    const prev = lastDeps.current;
    if (prev && prev.length === deps.length && prev.every((dep, index) => Object.is(dep, deps[index]))) return;
    lastDeps.current = deps;
    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const PROGRESS_EVENT = 'progress';

let isProgress = 0;

/** Progress counter; the progress bar at the bottom of NavState animates while it is > 0. */
export function getIsProgress() {
  return isProgress;
}

export function setIsProgress(value: number) {
  isProgress = value;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

let requestCount = 0;

/**
 * Calls backend endpoint `/api/<path>` with a POST of `data` (sent as ApiRequestDto with VERSION_CLIENT and the current language)
 * and returns ApiResponseDto.data, or undefined if the status is not ok; isProgress is increased by 1 for the duration of the call.
 * Alert messages sent by the backend (ApiResponseDto.alerts) are added to the alert list, plus an Error alert if the status is not ok
 * or no response arrives at all (the error is rethrown). A redirect url sent by the backend (ApiResponseDto.redirectUrl) is passed to redirect().
 * Every call increases requestCount by 1 and sends it as ApiRequestDto.requestCount; the backend echoes it as ApiResponseDto.responseCount.
 */
export async function apiFetch<T>(path: string, data?: unknown, init?: RequestInit): Promise<T | undefined> {
  setIsProgress(isProgress + 1);
  try {
    requestCount += 1;
    const requestDto: ApiRequestDto<unknown> = {
      data: data ?? null,
      versionClient: VERSION_CLIENT,
      language: languageFromPathname(window.location.pathname),
      requestCount,
    };
    let response: Response;
    try {
      response = await fetch(`${apiUrl}${path}`, {
        ...init,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestDto),
      });
    } catch (error) {
      // No response at all (e.g. network down). An intentionally aborted call is not an error.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        addAlert(AlertEnum.Error, `Request ${path} failed (no response from server)`);
      }
      throw error;
    }
    let body: ApiResponseDto<T> | undefined;
    try {
      body = await response.json();
    } catch {
      // Not an ApiResponseDto (e.g. a platform error page); the generic Error alert below covers a status not ok.
    }
    const alertDtoList: AlertDto[] = body?.alerts ?? [];
    alertDtoList.forEach((alertDto) => addAlert(alertDto.alertEnum, alertDto.text));
    // Generic Error alert, unless the backend already sent a more specific one.
    if (!response.ok && !alertDtoList.some((alertDto) => alertDto.alertEnum === AlertEnum.Error)) {
      // statusText is empty over HTTP/2, so it's only appended when present.
      const status = [response.status, response.statusText].filter(Boolean).join(' ');
      addAlert(AlertEnum.Error, `Request ${path} failed (${status})`);
    }
    if (body?.redirectUrl !== undefined) {
      redirect(body.redirectUrl);
    }
    if (!response.ok) {
      return undefined;
    }
    return body?.data ?? undefined;
  } finally {
    setIsProgress(isProgress - 1);
  }
}

export const ALERT_EVENT = 'alert';

let alertList: AlertDto[] = [];

/** Open alert messages; NavState shows the top (first) one. */
export function getAlertList() {
  return alertList;
}

export function addAlert(alertEnum: AlertEnum, text: string) {
  alertList = [...alertList, { alertEnum, text }];
  window.dispatchEvent(new Event(ALERT_EVENT));
}

export const REDIRECT_EVENT = 'redirect';

/** Navigates to `url` (language neutral path such as '/'); NavState listens for REDIRECT_EVENT and adds the current language prefix. */
export function redirect(url: string) {
  window.dispatchEvent(new CustomEvent<string>(REDIRECT_EVENT, { detail: url }));
}

/** Removes the top alert message, so the next one is shown. */
export function removeAlert() {
  alertList = alertList.slice(1);
  window.dispatchEvent(new Event(ALERT_EVENT));
}
