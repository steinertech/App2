import { apiUrl } from '../page/App.tsx';

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

/** Calls backend endpoint `/api/<path>`; isProgress is increased by 1 for the duration of the call. */
export async function apiFetch(path: string, init?: RequestInit) {
  setIsProgress(isProgress + 1);
  try {
    return await fetch(`${apiUrl}${path}`, init);
  } finally {
    setIsProgress(isProgress - 1);
  }
}
