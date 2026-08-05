import { VERSION_SERVER, corsHeaders } from '../util';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    return new Response(`App Version ${VERSION_SERVER}`, {
      headers: corsHeaders(request),
    });
  },
};
