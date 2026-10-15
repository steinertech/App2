import { DbDto } from './db-dto.js';

export interface SessionDto extends DbDto {
  email?: string;
  projectName?: string;
  isSignIn?: boolean;
  sessionId?: string;
}
