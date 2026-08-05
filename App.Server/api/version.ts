import { domainName, VERSION_SERVER } from '../util';

export default {
  fetch(request: Request): Response {
    const origin = domainName(request);
    return new Response(JSON.stringify({ version: VERSION_SERVER, origin }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
