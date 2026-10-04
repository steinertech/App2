import { gridPlaneLoad } from '../util/util-grid.js';
import { apiHandler, jsonResponse } from '../util/util-main.js';

export default apiHandler('POST', async (request) => {
  const gridPlaneDto = await request.json();

  const gridPlane = await gridPlaneLoad(request, gridPlaneDto);

  return jsonResponse(gridPlane);
});
