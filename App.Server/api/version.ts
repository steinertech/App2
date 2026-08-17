import { VERSION_SERVER, corsHeaders, domainName } from '../util/util-main.js';
import { languageFromRequest, translateText } from '../util/util-i18n.js';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const language = languageFromRequest(request);

    return new Response(
      JSON.stringify({ version: VERSION_SERVER, domainName: domainName(request), text: translateText(language) }),
      { headers: { 'content-type': 'application/json', ...corsHeaders(request) } },
    );
  },
};
