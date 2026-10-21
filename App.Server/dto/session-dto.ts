import { DbDto } from './db-dto.js';

export interface SessionDto extends DbDto {
  /** Same as sessionId (a random UUID), set by the backend on sign-in (see signIn). */
  name?: string;
  email?: string;
  projectName?: string;
  isSignIn?: boolean;
  sessionId?: string;
}
