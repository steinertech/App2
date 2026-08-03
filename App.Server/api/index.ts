const VERSION = '1.12';

export default {
  fetch(request: Request): Response {
    return new Response(`App Version ${VERSION}`);
  },
};
