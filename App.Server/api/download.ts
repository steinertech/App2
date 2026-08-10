import { storageDownload } from '../util-storage';
import { corsHeaders } from '../util';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = await storageDownload();
    return new Response(JSON.stringify({ url }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
