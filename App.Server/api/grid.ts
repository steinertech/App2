import { gridLoad } from '../util/util-grid';
import { corsHeaders } from '../util/util-main';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const gridDto = await request.json();

    const grid = gridLoad(request, gridDto);

    return new Response(JSON.stringify(grid), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
