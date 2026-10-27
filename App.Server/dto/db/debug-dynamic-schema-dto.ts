import { DbDto } from './db-dto.js';

export interface DebugDynamicSchemaDto extends DbDto {
  /** Entered by the user in the Debug Dynamic Schema grid (a duplicate within the sectorKey is rejected by the database). Editable, so the grid's rowKey is the _id hex. */
  name?: string;
  text?: string;
  dynamicTableName?: string;
  dynamicColumnName?: string;
  /** undefined (e.g. rows saved before it existed) counts as false. */
  isProperty?: boolean;
}
