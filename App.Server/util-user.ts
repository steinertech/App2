import client from './util-db';
import { UserDto } from './dto/UserDto';

export async function userRegister(email: string, password: string) {
  const collection = client.db().collection<UserDto>('myCollection');

  await collection.insertOne({
    email,
    password,
    sectorKey: 'Domain/my.com/Global/',
    type: 'UserDto',
  });
}
