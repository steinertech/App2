import { randomUUID } from 'crypto';
import client from './util-db';
import { UserDto } from '../dto/user-dto';
import { SessionDto } from '../dto/session-dto';
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
    return null;
  }

  const sessionCollection = client.db().collection<SessionDto>('myCollection');
  return sessionCollection.findOne({ sessionId, isLogin: true, type: 'SessionDto' });
}

export async function userLogout(request: Request) {
  const dto = await userSession(request);
  if (dto) {
    dto.isLogin = false;
    const sessionCollection = client.db().collection<SessionDto>('myCollection');
    await sessionCollection.updateOne({ _id: dto._id }, { $set: { isLogin: false } });
  }

  return dto;
}
