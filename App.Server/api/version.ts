import { VERSION_SERVER, apiHandler, domainName, jsonResponse, requestLanguage } from '../util/util-main.js';
import { translateText } from '../util/util-i18n.js';
import { userSession } from '../util/util-user.js';
import type { VersionResponseDto } from '../dto/shared/version-dto.js';

export default apiHandler('POST', async (request) => {
  const language = requestLanguage(request);
  const session = await userSession(request);

  const version: VersionResponseDto = {
    version: VERSION_SERVER,
    domainName: domainName(request),
    text: translateText(language),
    email: session?.email,
    projectName: session?.projectName,
  };

  return jsonResponse(version);
});
