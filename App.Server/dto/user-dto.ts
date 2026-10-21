import { DbDto } from './db-dto.js';

export interface UserDto extends DbDto {
  /** domainName + "/" + email, set by the backend on sign-up (see util-user.ts). */
  name?: string;
  email?: string;
  password?: string;
  projectNames?: string[];
  projectName?: string;
}
