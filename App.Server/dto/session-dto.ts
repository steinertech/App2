import { DbDto } from './db-dto.js';

export interface SessionDto extends DbDto {
  /** "SessionId/<sessionId>/" (sessionId being a random UUID), set by the backend on sign-in (see signIn). */
  name?: string;
  email?: string;
  projectName?: string;
  isSignIn?: boolean;
  sessionId?: string;
}
