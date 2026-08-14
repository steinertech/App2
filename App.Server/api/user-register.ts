import { userRegister } from '../util/util-user.js';
import { corsHeaders } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const { email, password } = await request.json();

    await userRegister(request, email, password);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
