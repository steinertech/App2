import { userSignIn, userSignOut, userSignUp, userSession } from '../util/util-user.js';
import { apiHandler, domainName, jsonResponse } from '../util/util-main.js';
import { UserRequestEnum } from '../dto/shared/user-request-dto.js';
import type { UserRequestDto, UserResponseDto } from '../dto/shared/user-request-dto.js';

const json = (body: UserResponseDto | null, status = 200, headers: Record<string, string> = {}) =>
  jsonResponse(body, status, headers);

export default apiHandler('POST', async (request) => {
  const { requestEnum, email, password }: UserRequestDto = await request.json();

  switch (requestEnum) {
    case UserRequestEnum.SignUp: {
      await userSignUp(request, email ?? '', password ?? '');
      return json({ success: true });
    }
    case UserRequestEnum.SignIn: {
      const sessionId = await userSignIn(request, email ?? '', password ?? '');
      if (!sessionId) {
        return json({ success: false }, 401);
      }
      return json({ success: true }, 200, {
        'set-cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Secure; SameSite=None`,
      });
    }
    case UserRequestEnum.SignOut: {
      await userSignOut(request);
      // Never echo the SessionDto (it carries sessionId, which is an HttpOnly cookie).
      return json({ success: true });
    }
    case UserRequestEnum.Session: {
      const session = await userSession(request);
      // Only expose what App.Web needs; never echo sessionId (it's an HttpOnly cookie).
      return json(
        session ? { email: session.email, projectName: session.projectName, domainName: domainName(request) } : null,
      );
    }
    default:
      return json({ success: false }, 400);
  }
});
