import { userLogin, userLogout, userRegister, userSession } from '../util/util-user.js';
import { corsHeaders, domainName } from '../util/util-main.js';
import { UserRequestEnum } from '../dto/shared/user-request-dto.js';
import type { UserRequestDto, UserResponseDto } from '../dto/shared/user-request-dto.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const json = (body: UserResponseDto | null, status = 200, headers: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers, ...corsHeaders(request) },
      });

    const { requestEnum, email, password }: UserRequestDto = await request.json();

    switch (requestEnum) {
      case UserRequestEnum.Register: {
        await userRegister(request, email ?? '', password ?? '');
        return json({ success: true });
      }
      case UserRequestEnum.Login: {
        const sessionId = await userLogin(request, email ?? '', password ?? '');
        if (!sessionId) {
          return json({ success: false }, 401);
        }
        return json({ success: true }, 200, {
          'set-cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Secure; SameSite=None`,
        });
      }
      case UserRequestEnum.Logout: {
        await userLogout(request);
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
  },
};
