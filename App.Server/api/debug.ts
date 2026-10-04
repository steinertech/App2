import { storageNew } from '../util/util-storage.js';
import { corsHeaders } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    await storageNew(request, '', 'a/b/');

    return new Response(JSON.stringify({ path: 'a/b/' }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
