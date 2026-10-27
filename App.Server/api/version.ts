import { versionLoad } from '../util/util-version.js';
import { apiHandler, jsonResponse } from '../util/util-main.js';

export default apiHandler('POST', async (request) => {
  const version = await versionLoad(request);

  return jsonResponse(version);
});
