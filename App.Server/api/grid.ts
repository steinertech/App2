import { gridLoad } from '../util/util-grid.ts';
import { corsHeaders } from '../util/util-main.ts';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const gridDto = await request.json();

    const grid = await gridLoad(request, gridDto);

    return new Response(JSON.stringify(grid), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
