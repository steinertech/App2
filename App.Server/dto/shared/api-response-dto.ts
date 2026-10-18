import type { AlertDto } from './alert-dto.js';

/**
 * Body of every JSON response of App.Server, built by apiHandler from the handler's jsonResponse(data, ...).
 * Read by App.Web's apiFetch, which shows the alerts, navigates to redirectUrl and returns data.
 */
export interface ApiResponseDto<T> {
  /** The endpoint's own response DTO; null if the handler threw (status 500). */
  data: T | null;
  /** Alert messages queued via alertAdd (including a thrown error's message), shown in App.Web's NavState. */
  alerts?: AlertDto[];
  /** ONE language neutral App.Web path such as '/' set via redirectSet; App.Web navigates there. */
  redirectUrl?: string;
}
