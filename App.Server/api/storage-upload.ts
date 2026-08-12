import { storageUpload } from '../util/util-storage';
import { corsHeaders } from '../util/util-main';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const blob = await storageUpload();
    return new Response(JSON.stringify(blob), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
