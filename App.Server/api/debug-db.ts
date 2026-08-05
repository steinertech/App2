import client from '../util-db';
import { UserDto } from '../dto/UserDto';

export default {
  async fetch(request: Request): Promise<Response> {
    const collection = client.db().collection<UserDto>('User');

    await collection.insertOne({ email: 'debug@debug.debug' });
    const users = await collection.find({}).toArray();

    return new Response(JSON.stringify(users), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
