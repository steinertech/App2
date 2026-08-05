import client from './util-db';
import { UserDto } from './dto/UserDto';

export async function userRegister(userName: string, password: string) {
  const collection = client.db().collection<UserDto>('myCollection');

  await collection.insertOne({
    email: userName,
    password,
    sectorKey: 'Domain/my.com/Global/',
    type: 'UserDto',
  });
}
