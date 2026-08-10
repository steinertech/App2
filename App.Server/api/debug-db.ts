import client from '../util-db';
import { UserDto } from '../dto/user-dto';
import { domainName, corsHeaders } from '../util';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const collection = client.db().collection<UserDto>('myCollection');

    const { email } = await request.json();

    await collection.insertOne({
      email,
      name: email,
      sectorKey: `Domain/${domainName(request)}/Global/`,
      type: 'UserDto',
    });
    const users = await collection.find({ type: 'UserDto' }).toArray();

    return new Response(JSON.stringify(users), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
