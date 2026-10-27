import { userApi } from '../util/api/util-user-request.js';
import { apiHandler, requestData } from '../util/core/util-main.js';
import type { UserRequestDto } from '../dto/shared/user-request-dto.js';

export default apiHandler('POST', async (request) => {
  const userRequestDto = requestData<UserRequestDto>(request);

  return userApi(request, userRequestDto);
});
