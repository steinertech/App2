import { userLogin } from '../util-user';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    const { email, password } = await request.json();

    const sessionId = await userLogin(request, email, password);

    if (!sessionId) {
      return new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'content-type': 'application/json',
        'set-cookie': `sessionId=${sessionId}; HttpOnly; Path=/`,
      },
    });
  },
};
