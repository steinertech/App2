import { VERSION_SERVER, domainName, requestLanguage } from './util-main.js';
import { translateText } from './util-i18n.js';
import { userSession } from './util-user.js';
import type { VersionResponseDto } from '../dto/shared/version-dto.js';

/** Returns the VersionResponseDto of api/version.ts: server version, domain, translated text and the signed-in user's email and project. */
export async function versionLoad(request: Request): Promise<VersionResponseDto> {
  const language = requestLanguage(request);
  const session = await userSession(request);

  return {
    version: VERSION_SERVER,
    domainName: domainName(request),
    text: translateText(language),
    email: session?.email,
    projectName: session?.projectName,
  };
}
