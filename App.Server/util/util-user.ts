import { randomUUID } from 'crypto';
import client, { DB_NAME, dbInsert, dbLoad, dbUpdate } from './util-db.js';
import { UserDto } from '../dto/db/user-dto.js';
import { SessionDto } from '../dto/db/session-dto.js';
import { alertAdd, domainName, jsonResponse, redirectSet, sectorKeyDb } from './util-main.js';
import type { ApiResult } from './util-main.js';
import { UserRequestEnum } from '../dto/shared/user-request-dto.js';
import { AlertEnum } from '../dto/shared/alert-dto.js';
import type { UserRequestDto, UserResponseDto } from '../dto/shared/user-request-dto.js';

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

const json = (body: UserResponseDto | null, status = 200, headers: Record<string, string> = {}) =>
  jsonResponse(body, status, headers);

/** Handles a UserRequestDto of api/user.ts, the operation selected by its requestEnum. */
export async function userRequest(request: Request, userRequestDto: UserRequestDto): Promise<ApiResult> {
  const { requestEnum, email, password } = userRequestDto;

  switch (requestEnum) {
    case UserRequestEnum.SignUp: {
      await signUp(request, email ?? '', password ?? '');
      alertAdd(request, AlertEnum.Success, 'You successfully signed up. Welcome!');
      return json({ success: true });
    }
    case UserRequestEnum.SignIn: {
      const sessionId = await signIn(request, email ?? '', password ?? '');
      if (!sessionId) {
        alertAdd(request, AlertEnum.Error, 'Invalid email or password');
        return json({ success: false }, 401);
      }
      alertAdd(request, AlertEnum.Success, 'You successfully signed in.');
      redirectSet(request, '/');
      return json({ success: true }, 200, {
        'set-cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Secure; SameSite=None; Max-Age=3600`,
      });
    }
    case UserRequestEnum.SignOut: {
      await signOut(request);
      alertAdd(request, AlertEnum.Success, 'You successfully signed out');
      // Never echo the SessionDto (it carries sessionId, which is an HttpOnly cookie).
      return json({ success: true });
    }
    case UserRequestEnum.Session: {
      const session = await userSession(request);
      // Only expose what App.Web needs; never echo sessionId (it's an HttpOnly cookie).
      return json(
        session ? { email: session.email, projectName: session.projectName, domainName: domainName(request) } : null,
      );
    }
    default:
      return json({ success: false }, 400);
  }
}
