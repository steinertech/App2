import client from './util-db';
import { UserDto } from './dto/UserDto';
import { SessionDto } from './dto/SessionDto';
import { domainName } from './util';

export async function userRegister(request: Request, email: string, password: string) {
  const collection = client.db().collection<UserDto>('myCollection');

  await collection.insertOne({
    email,
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
  const sessionId = crypto.randomUUID();

  await sessionCollection.insertOne({
    email,
    sectorKey: `Domain/${domainName(request)}/Global/`,
    type: 'SessionDto',
    isLogin: true,
    sessionId,
  });

  return sessionId;
}
