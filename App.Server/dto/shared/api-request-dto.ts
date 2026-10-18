export type Language = 'en' | 'de';

/**
 * Body of every POST request to App.Server, built by App.Web's apiFetch around the endpoint's own request DTO.
 * Parsed once by apiHandler; handlers read `data` via requestData(request).
 */
export interface ApiRequestDto<T> {
  /** The endpoint's own request DTO (e.g. UserRequestDto, GridPlaneDto). */
  data: T;
  /** App.Web's VERSION_CLIENT; apiHandler adds a Warning alert if it differs from VERSION_SERVER. */
  versionClient?: string;
  /** App.Web's current language (from the url prefix); read via requestLanguage(request). */
  language?: Language;
  /** App.Web's apiFetch counter, increased by 1 on every request; echoed back as ApiResponseDto.responseCount. */
  requestCount?: number;
}
