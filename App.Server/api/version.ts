import { VERSION_SERVER, apiHandler, domainName, jsonResponse } from '../util/util-main.js';
import { languageFromRequest, translateText } from '../util/util-i18n.js';
import { userSession } from '../util/util-user.js';

export default apiHandler('GET', async (request) => {
  const language = languageFromRequest(request);
  const session = await userSession(request);

  return jsonResponse({
    version: VERSION_SERVER,
    domainName: domainName(request),
    text: translateText(language),
    email: session?.email,
    projectName: session?.projectName,
  });
});
