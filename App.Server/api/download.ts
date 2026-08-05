import { download } from '../util-blob';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = await download();
    return new Response(JSON.stringify({ url }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
