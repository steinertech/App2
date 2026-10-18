import { gridPlaneLoad } from '../util/util-grid.js';
import { apiHandler, jsonResponse, requestData } from '../util/util-main.js';
import type { GridPlaneDto } from '../dto/shared/grid-dto.js';

export default apiHandler('POST', async (request) => {
  const gridPlaneDto = requestData<GridPlaneDto>(request);

  const gridPlane = await gridPlaneLoad(request, gridPlaneDto);

  return jsonResponse(gridPlane);
});
