import client from '../util-db';
import { User } from '../dto/User';

export default {
  async fetch(request: Request): Promise<Response> {
    const collection = client.db().collection<User>('User');

    await collection.insertOne({ email: 'debug@debug.debug' });
    const users = await collection.find({}).toArray();

    return new Response(JSON.stringify(users), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
