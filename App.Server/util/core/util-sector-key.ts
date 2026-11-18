import client, { DB_NAME } from './util-db-client.js';
import { domainName, redirectSet } from './util-main.js';
import { SessionDto } from '../../dto/db/session-dto.js';

// Sector keys and the session they require (userSession lives here, not in util-db.ts, so neither file imports the other in a cycle).

/** The signed in SessionDto of the request's sessionId cookie, or null. */
export async function userSession(request: Request): Promise<SessionDto | null> {
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
  const key = await sectorKeyDb(request, 'SessionDto');
  return client.db(DB_NAME).collection<SessionDto>('myCollection').findOne({ sectorKey: key, type: 'SessionDto', sessionId, isSignIn: true });
}

async function sectorKey(request: Request, isProject: boolean = true): Promise<string> {
  if (isProject) {
    const dto = await userSession(request);
    if (!dto) {
      redirectSet(request, '/sign-in');
      throw new Error('User not signed in!');
    }
    // SessionDto.projectName mirrors UserDto.projectName (copied on sign-in, kept in sync by userProject).
    if (!dto.projectName) throw new Error('User has no project selected!');
    return 'Domain' + '/' + domainName(request) + '/' + 'Project' + '/' + dto.projectName + '/';
  }
  return 'Domain' + '/' + domainName(request) + '/' + 'Global' + '/';
}

/** sectorKey(request, false) plus "Type/<type>/", type being the name of a DbDto derived interface (e.g. 'UserDto'; interfaces don't exist at runtime, so it is passed by name). */
export async function sectorKeyDb(request: Request, type: string): Promise<string> {
  return (await sectorKey(request, false)) + 'Type' + '/' + type + '/';
}

/** sectorKey(request, true) plus "Type/<type>/", type being the name of a DbDto derived interface (e.g. 'PropertyDto'). Requires sign-in and a selected project like sectorKey. */
export async function sectorKeyProjectDb(request: Request, type: string): Promise<string> {
  return (await sectorKey(request, true)) + 'Type' + '/' + type + '/';
}

/** sectorKey(request, false) plus "Storage/", the path prefix of global blobs. */
export async function sectorKeyStorage(request: Request): Promise<string> {
  return (await sectorKey(request, false)) + 'Storage' + '/';
}

/** sectorKey(request, true) plus "Storage/", the path prefix of project blobs. Requires sign-in and a selected project like sectorKey. */
export async function sectorKeyProjectStorage(request: Request): Promise<string> {
  return (await sectorKey(request, true)) + 'Storage' + '/';
}
