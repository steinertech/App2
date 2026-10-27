import client, { DB_NAME } from './util-db.js';
import { SessionDto } from '../../dto/db/session-dto.js';
import { sectorKeyDb } from './util-main.js';

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

  const sessionCollection = client.db(DB_NAME).collection<SessionDto>('myCollection');
  return sessionCollection.findOne({
    sessionId,
    isSignIn: true,
    sectorKey: await sectorKeyDb(request, 'SessionDto'),
    type: 'SessionDto',
  });
}
