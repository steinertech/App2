import { VERSION_SERVER, corsHeaders } from '../util';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    return new Response(JSON.stringify({ version: VERSION_SERVER }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
