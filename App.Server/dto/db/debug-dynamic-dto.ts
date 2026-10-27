import { DbDto } from './db-dto.js';

export interface DebugDynamicDto extends DbDto {
  /** Entered by the user in the Debug Dynamic grid (a duplicate within the sectorKey is rejected by the database). Editable, so the grid's rowKey is the _id hex. */
  name?: string;
  tableName?: string;
}
