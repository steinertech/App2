import { projectList } from '../util/util-project';
import { corsHeaders } from '../util/util';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      const projects = await projectList(request);
      return new Response(JSON.stringify(projects), {
        headers: { 'content-type': 'application/json', ...corsHeaders(request) },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 401,
        headers: { 'content-type': 'application/json', ...corsHeaders(request) },
      });
    }
  },
};
