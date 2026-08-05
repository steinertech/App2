import client from '../util-db';
import { UserDto } from '../dto/UserDto';
import { domainName } from '../util';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    const collection = client.db().collection<UserDto>('collectionMy');

    const { email } = await request.json();

    await collection.insertOne({
      email,
      sectorKey: `Domain/${domainName(request)}/Global/`,
    });
    const users = await collection.find({}).toArray();

    return new Response(JSON.stringify(users), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
