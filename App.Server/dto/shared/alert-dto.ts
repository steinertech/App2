export enum AlertEnum {
  Success = 'Success',
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
}

/** Response header carrying a request's alert messages as URI-encoded JSON (AlertDto[]). Set by apiHandler, read by App.Web's apiFetch. */
export const ALERT_HEADER = 'x-alert-list';

/** Alert message shown in App.Web's NavState. Sent by App.Server via ALERT_HEADER (see alertAdd). */
export interface AlertDto {
  alertEnum: AlertEnum;
  text: string;
}
