import { apiUrl } from '../page/App.tsx';
import { ALERT_HEADER, type AlertDto, AlertEnum } from '../../../App.Server/dto/shared/alert-dto.ts';
import { REDIRECT_HEADER } from '../../../App.Server/dto/shared/redirect-dto.ts';

export const VERSION_CLIENT = '1.18';

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

/**
 * Calls backend endpoint `/api/<path>`; isProgress is increased by 1 for the duration of the call.
 * Alert messages sent by the backend (ALERT_HEADER) are added to the alert list, plus an Error alert if the status is not ok
 * or no response arrives at all (the error is rethrown). A redirect url sent by the backend (REDIRECT_HEADER) is passed to redirect().
 */
export async function apiFetch(path: string, init?: RequestInit) {
  setIsProgress(isProgress + 1);
  try {
    let response: Response;
    try {
      response = await fetch(`${apiUrl}${path}`, init);
    } catch (error) {
      // No response at all (e.g. network down). An intentionally aborted call is not an error.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        addAlert(AlertEnum.Error, `Request ${path} failed (no response from server)`);
      }
      throw error;
    }
    const alertHeader = response.headers.get(ALERT_HEADER);
    const alertDtoList: AlertDto[] = alertHeader ? JSON.parse(decodeURIComponent(alertHeader)) : [];
    alertDtoList.forEach((alertDto) => addAlert(alertDto.alertEnum, alertDto.text));
    // Generic Error alert, unless the backend already sent a more specific one.
    if (!response.ok && !alertDtoList.some((alertDto) => alertDto.alertEnum === AlertEnum.Error)) {
      // statusText is empty over HTTP/2, so it's only appended when present.
      const status = [response.status, response.statusText].filter(Boolean).join(' ');
      addAlert(AlertEnum.Error, `Request ${path} failed (${status})`);
    }
    const redirectHeader = response.headers.get(REDIRECT_HEADER);
    if (redirectHeader !== null) {
      redirect(decodeURIComponent(redirectHeader));
    }
    return response;
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
