import { versionApi } from '../util/util-version.js';
import { apiHandler, jsonResponse } from '../util/util-main.js';

export default apiHandler('POST', async (request) => {
  const version = await versionApi(request);

  return jsonResponse(version);
});
