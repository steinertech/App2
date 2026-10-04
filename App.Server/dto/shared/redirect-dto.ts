/**
 * Response header carrying ONE redirect url (URI-encoded, language neutral App.Web path such as '/').
 * Set by apiHandler (see redirectSet), read by App.Web's apiFetch, which navigates there.
 */
export const REDIRECT_HEADER = 'x-redirect-url';
