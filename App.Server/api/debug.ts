import { debugLoad, debugSave } from '../util/util-debug.js';
import { apiHandler, jsonResponse } from '../util/util-main.js';
import { DebugRequestEnum } from '../dto/shared/debug-request-dto.js';
import type { DebugRequestDto, DebugResponseDto } from '../dto/shared/debug-request-dto.js';

const json = (body: DebugResponseDto | null, status = 200) => jsonResponse(body, status);

export default apiHandler('POST', async (request) => {
  const { requestEnum, name, text }: DebugRequestDto = await request.json();

  if (!name) {
    throw new Error('Debug name is required!');
  }

  switch (requestEnum) {
    case DebugRequestEnum.Save: {
      await debugSave(request, name, text ?? '');
      return json({ name, text: text ?? '' });
    }
    case DebugRequestEnum.Load: {
      const debug = await debugLoad(request, name);
      return json(debug ? { name: debug.name, text: debug.text } : null);
    }
    default:
      return json(null, 400);
  }
});
