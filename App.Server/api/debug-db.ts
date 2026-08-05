import client from '../util-db';
import { UserDto } from '../dto/UserDto';
import { domainName } from '../util';

export default {
  async fetch(request: Request): Promise<Response> {
    const collection = client.db().collection<UserDto>('User');

    await collection.insertOne({
      email: 'debug@debug.debug',
      sectorKey: `Domain/${domainName(request)}/Global/`,
    });
    const users = await collection.find({}).toArray();

    return new Response(JSON.stringify(users), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
