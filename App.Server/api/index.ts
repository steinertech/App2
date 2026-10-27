import { VERSION_SERVER, apiHandler } from '../util/core/util-main.js';

export default apiHandler('GET', () => new Response(`App Version ${VERSION_SERVER}`));
