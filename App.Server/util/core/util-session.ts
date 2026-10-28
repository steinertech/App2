import { dbLoadByFilter } from './util-db.js';
import { SessionDto } from '../../dto/db/session-dto.js';

export async function userSession(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const sessionId = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('sessionId='))
    ?.slice('sessionId='.length);

  if (!sessionId) {
    return null;
  }

  // Global sector (isProject false): the project sector key itself needs the session.
  return (await dbLoadByFilter<SessionDto>(request, 'SessionDto', { sessionId, isSignIn: true }, false))[0] ?? null;
}
