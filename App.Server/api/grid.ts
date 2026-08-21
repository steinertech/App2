import { gridLoad } from '../util/util-grid.js';
import { corsHeaders } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const gridPageDto = await request.json();

    const gridPage = await gridLoad(request, gridPageDto);

    return new Response(JSON.stringify(gridPage), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
