import { DbDto } from './db-dto.js';

export interface DebugDto extends DbDto {
  /** Entered by the user in the Debug Data grid (a duplicate within the sectorKey is rejected by the database). Editable, so the grid's rowKey is the _id hex. */
  name?: string;
  text?: string;
}
