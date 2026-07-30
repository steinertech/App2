export default {
  fetch(request: Request): Response {
    return new Response(JSON.stringify({ version: '1.12' }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
