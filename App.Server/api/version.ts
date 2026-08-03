const VERSION_SERVER = '1.13';

export default {
  fetch(request: Request): Response {
    const originHeader = request.headers.get('origin');
    const origin = originHeader ? new URL(originHeader).hostname : 'unknown';
    return new Response(JSON.stringify({ version: VERSION_SERVER, origin }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
