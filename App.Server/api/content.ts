import { loadContent } from '../util/util-content.js';
import { apiHandler, jsonResponse, requestData } from '../util/util-main.js';
import type { ContentRequestDto } from '../dto/shared/content-dto.js';

export default apiHandler('POST', async (request) => {
  const { contentName } = requestData<ContentRequestDto>(request);

  const content = await loadContent(request, contentName ?? '');

  return jsonResponse(content);
});
