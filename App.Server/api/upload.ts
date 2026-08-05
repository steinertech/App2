import { upload } from '../util-blob';
import { corsHeaders } from '../util';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const blob = await upload();
    return new Response(JSON.stringify(blob), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
