import { DbDto } from './db-dto.js';

export interface ProjectDto extends DbDto {
  /** Project name, entered by the user in the Project grid; the grid's rowKey (update and delete match by it, see util-project.ts). */
  name?: string;
  description?: string;
}
