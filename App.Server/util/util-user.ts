import { randomUUID } from 'crypto';
import client, { DB_NAME, dbInsert, dbLoad, dbUpdate } from './util-db.js';
import { UserDto } from '../dto/user-dto.js';
import { SessionDto } from '../dto/session-dto.js';
import { domainName, sectorKeyDb } from './util-main.js';

/** Returns UserDto.name: "Domain/<domainName>/Email/<email>/". */
function userName(request: Request, email: string): string {
  return 'Domain/' + domainName(request) + '/Email/' + email + '/';
}

export async function signUp(request: Request, email: string, password: string) {
  await dbInsert<UserDto>(request, 'UserDto', [{ email, name: userName(request, email), password }], false);
}

export async function signIn(request: Request, email: string, password: string) {
  const userCollection = client.db(DB_NAME).collection<UserDto>('myCollection');

  const user = await userCollection.findOne({
    email,
    password,
    name: userName(request, email),
    sectorKey: await sectorKeyDb(request, 'UserDto'),
    type: 'UserDto',
  });
  if (!user) {
    return null;
  }

  const sessionId = randomUUID();

  await dbInsert<SessionDto>(
    request,
    'SessionDto',
    [{ email, isSignIn: true, sessionId, name: 'SessionId/' + sessionId + '/', projectName: user.projectName }],
    false,
  );

  return sessionId;
}

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

export async function usersLoad(request: Request): Promise<UserDto[]> {
  return dbLoad<UserDto>(request, 'UserDto', false);
}

export async function signOut(request: Request) {
  const dto = await userSession(request);
  if (dto) {
    dto.isSignIn = false;
    await dbUpdate<SessionDto>(request, 'SessionDto', [{ _id: dto._id, isSignIn: false }], false);
  }

  return dto;
}

export async function userProject(request: Request, projectName: string) {
  const dto = await userSession(request);
  if (dto) {
    dto.projectName = projectName;
    await dbUpdate<SessionDto>(request, 'SessionDto', [{ _id: dto._id, projectName }], false);

    const userCollection = client.db(DB_NAME).collection<UserDto>('myCollection');
    await userCollection.updateOne({ email: dto.email, sectorKey: await sectorKeyDb(request, 'UserDto'), type: 'UserDto' }, { $set: { projectName } });
  }

  return dto;
}
