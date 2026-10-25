import { DbDto } from './db-dto.js';

export interface UserDto extends DbDto {
  /** "Domain/<domainName>/Email/<email>/", set by the backend on sign-up (see userName in util-user.ts). */
  name?: string;
  email?: string;
  password?: string;
  projectNames?: string[];
  projectName?: string;
}
