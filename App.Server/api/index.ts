import { VERSION_SERVER } from '../util';

export default {
  fetch(request: Request): Response {
    return new Response(`App Version ${VERSION_SERVER}`);
  },
};
