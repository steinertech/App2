import { userLogout } from '../util/util-user.js';
import { corsHeaders } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const session = await userLogout(request);

    return new Response(JSON.stringify(session), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
