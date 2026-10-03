import { userSession } from '../util/util-user.js';
import { corsHeaders, domainName } from '../util/util-main.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const session = await userSession(request);

    // Only expose what App.Web needs; never echo sessionId (it's an HttpOnly cookie).
    return new Response(
      JSON.stringify(
        session ? { email: session.email, projectName: session.projectName, domainName: domainName(request) } : null,
      ),
      { headers: { 'content-type': 'application/json', ...corsHeaders(request) } },
    );
  },
};
