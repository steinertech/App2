import { randomUUID } from 'crypto';
import client from './util-db';
import { UserDto } from './dto/UserDto';
import { SessionDto } from './dto/SessionDto';
import { domainName } from './util';

export async function userRegister(request: Request, email: string, password: string) {
  const collection = client.db().collection<UserDto>('myCollection');

  await collection.insertOne({
    email,
    name: email,
    password,
    sectorKey: `Domain/${domainName(request)}/Global/`,
    type: 'UserDto',
  });
}

export async function userLogin(request: Request, email: string, password: string) {
  const userCollection = client.db().collection<UserDto>('myCollection');

  const user = await userCollection.findOne({ email, password, type: 'UserDto' });
  if (!user) {
    return null;
  }

  const sessionCollection = client.db().collection<SessionDto>('myCollection');
  const sessionId = randomUUID();

  await sessionCollection.insertOne({
    email,
    sectorKey: `Domain/${domainName(request)}/Global/`,
    type: 'SessionDto',
    isLogin: true,
    sessionId,
    name: sessionId,
  });

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
    return { sessionId } as SessionDto;
  }

  const sessionCollection = client.db().collection<SessionDto>('myCollection');
  const session = await sessionCollection.findOne({ sessionId, isLogin: true, type: 'SessionDto' });

  return session ?? ({ sessionId } as SessionDto);
}
