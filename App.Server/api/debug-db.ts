import client from '../util/util-db.js';
import { UserDto } from '../dto/user-dto.js';
import { corsHeaders } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const collection = client.db().collection<UserDto>('myCollection');

    const users = await collection.find({ type: 'UserDto' }).toArray();

    return new Response(JSON.stringify(users), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
