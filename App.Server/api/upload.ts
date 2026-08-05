import { upload } from '../util-blob';

export default {
  async fetch(request: Request): Promise<Response> {
    const blob = await upload();
    return new Response(JSON.stringify(blob), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
