import { gridPlaneLoad } from '../util/util-grid.js';
import { corsHeaders } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const gridPlaneDto = await request.json();

    const gridPlane = await gridPlaneLoad(request, gridPlaneDto);

    return new Response(JSON.stringify(gridPlane), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
