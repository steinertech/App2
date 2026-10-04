import { apiUrl } from '../page/App.tsx';
import { ALERT_HEADER, type AlertDto, type AlertEnum } from '../../../App.Server/dto/shared/alert-dto.ts';

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
 * Alert messages sent by the backend (ALERT_HEADER) are added to the alert list.
 */
export async function apiFetch(path: string, init?: RequestInit) {
  setIsProgress(isProgress + 1);
  try {
    const response = await fetch(`${apiUrl}${path}`, init);
    const alertHeader = response.headers.get(ALERT_HEADER);
    if (alertHeader) {
      const alertDtoList: AlertDto[] = JSON.parse(decodeURIComponent(alertHeader));
      alertDtoList.forEach((alertDto) => addAlert(alertDto.alertEnum, alertDto.text));
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

/** Removes the top alert message, so the next one is shown. */
export function removeAlert() {
  alertList = alertList.slice(1);
  window.dispatchEvent(new Event(ALERT_EVENT));
}
