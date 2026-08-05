import { domainName, VERSION_SERVER, corsHeaders } from '../util';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const origin = domainName(request);
    return new Response(JSON.stringify({ version: VERSION_SERVER, origin }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
