import { randomUUID } from 'crypto';
import client, { DB_NAME, dbInsert, dbLoad, dbUpdate } from '../core/util-db.js';
import { UserDto } from '../../dto/db/user-dto.js';
import { SessionDto } from '../../dto/db/session-dto.js';
import { domainName, sectorKeyDb } from '../core/util-main.js';
import { userSession } from '../core/util-session.js';

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
