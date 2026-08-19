import { randomUUID } from 'crypto';
import client from './util-db.js';
import { UserDto } from '../dto/server/user-dto.js';
import { SessionDto } from '../dto/server/session-dto.js';
import { sectorKey } from './util-main.js';

export async function userRegister(request: Request, email: string, password: string) {
  const collection = client.db().collection<UserDto>('myCollection');

  await collection.insertOne({
    email,
    name: email,
    password,
    sectorKey: await sectorKey(request, false),
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
    sectorKey: await sectorKey(request, false),
    type: 'SessionDto',
    isLogin: true,
    sessionId,
    name: sessionId,
    projectName: user.projectName,
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

export async function usersLoad(request: Request): Promise<UserDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<UserDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'UserDto' }).toArray();
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

export async function userProject(request: Request, projectName: string) {
  const dto = await userSession(request);
  if (dto) {
    dto.projectName = projectName;
    const sessionCollection = client.db().collection<SessionDto>('myCollection');
    await sessionCollection.updateOne({ _id: dto._id }, { $set: { projectName } });

    const userCollection = client.db().collection<UserDto>('myCollection');
    await userCollection.updateOne({ email: dto.email, sectorKey: dto.sectorKey, type: 'UserDto' }, { $set: { projectName } });
  }

  return dto;
}
