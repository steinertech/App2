import { versionApi } from '../util/api/util-version.js';
import { apiHandler, jsonResponse } from '../util/core/util-main.js';

export default apiHandler('POST', async (request) => {
  const version = await versionApi(request);

  return jsonResponse(version);
});
