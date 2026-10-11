import { loadContent } from '../util/util-content.js';
import { apiHandler, jsonResponse } from '../util/util-main.js';
import type { ContentRequestDto } from '../dto/shared/content-dto.js';

export default apiHandler('POST', async (request) => {
  const { contentName }: ContentRequestDto = await request.json();

  const content = await loadContent(request, contentName ?? '');

  return jsonResponse(content);
});
