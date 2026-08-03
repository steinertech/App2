export default {
  fetch(request: Request): Response {
    const origin = request.headers.get('origin') ?? 'unknown';
    return new Response(JSON.stringify({ version: '1.12', origin }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
