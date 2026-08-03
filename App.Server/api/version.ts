export default {
  fetch(request: Request): Response {
    const originHeader = request.headers.get('origin');
    const origin = originHeader ? new URL(originHeader).hostname : 'unknown';
    return new Response(JSON.stringify({ version: '1.12', origin }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
