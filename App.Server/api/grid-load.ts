import { gridLoadApi } from '../util/api/util-grid-plane.js';
import { apiHandler, jsonResponse, requestData } from '../util/core/util-main.js';
import type { GridPlaneDto } from '../dto/shared/grid-dto.js';

export default apiHandler('POST', async (request) => {
  const gridPlaneDto = requestData<GridPlaneDto>(request);

  const gridPlane = await gridLoadApi(request, gridPlaneDto);

  return jsonResponse(gridPlane);
});
