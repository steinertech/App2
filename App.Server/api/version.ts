import { VERSION_SERVER, corsHeaders, domainName } from '../util/util-main.js';
import { languageFromRequest, translateText } from '../util/util-i18n.js';
import { userSession } from '../util/util-user.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const language = languageFromRequest(request);
    const session = await userSession(request);

    return new Response(
      JSON.stringify({
        version: VERSION_SERVER,
        domainName: domainName(request),
        text: translateText(language),
        email: session?.email,
        projectName: session?.projectName,
      }),
      { headers: { 'content-type': 'application/json', ...corsHeaders(request) } },
    );
  },
};
