import { userApi } from '../util/util-user.js';
import { apiHandler, requestData } from '../util/util-main.js';
import type { UserRequestDto } from '../dto/shared/user-request-dto.js';

export default apiHandler('POST', async (request) => {
  const userRequestDto = requestData<UserRequestDto>(request);

  return userApi(request, userRequestDto);
});
