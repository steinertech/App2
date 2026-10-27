import { signIn, signOut, signUp } from '../db/util-user.js';
import { userSession } from '../core/util-session.js';
import { alertAdd, domainName, jsonResponse, redirectSet } from '../core/util-main.js';
import type { ApiResult } from '../core/util-main.js';
import { UserRequestEnum } from '../../dto/shared/user-request-dto.js';
import { AlertEnum } from '../../dto/shared/alert-dto.js';
import type { UserRequestDto, UserResponseDto } from '../../dto/shared/user-request-dto.js';

const json = (body: UserResponseDto | null, status = 200, headers: Record<string, string> = {}) =>
  jsonResponse(body, status, headers);

/** Handles a UserRequestDto of api/user.ts, the operation selected by its requestEnum. */
export async function userApi(request: Request, userRequestDto: UserRequestDto): Promise<ApiResult> {
  const { requestEnum, email, password } = userRequestDto;

  switch (requestEnum) {
    case UserRequestEnum.SignUp: {
      await signUp(request, email ?? '', password ?? '');
      alertAdd(request, AlertEnum.Success, 'You successfully signed up. Welcome!');
      return json({ success: true });
    }
    case UserRequestEnum.SignIn: {
      const sessionId = await signIn(request, email ?? '', password ?? '');
      if (!sessionId) {
        alertAdd(request, AlertEnum.Error, 'Invalid email or password');
        return json({ success: false }, 401);
      }
      alertAdd(request, AlertEnum.Success, 'You successfully signed in.');
      redirectSet(request, '/');
      return json({ success: true }, 200, {
        'set-cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Secure; SameSite=None; Max-Age=3600`,
      });
    }
    case UserRequestEnum.SignOut: {
      await signOut(request);
      alertAdd(request, AlertEnum.Success, 'You successfully signed out');
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
}
