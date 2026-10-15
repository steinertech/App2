import { DbDto } from './db-dto.js';

export interface ProjectDto extends DbDto {
  description?: string;
}
