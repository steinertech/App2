import { DbDto } from './db-dto.js';

export interface UserDto extends DbDto {
  email?: string;
  password?: string;
  projectNames?: string[];
  projectName?: string;
}
