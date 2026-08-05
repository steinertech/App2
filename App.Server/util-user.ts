import client from './util-db';
import { UserDto } from './dto/UserDto';
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
