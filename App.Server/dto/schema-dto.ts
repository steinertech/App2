import { DbDto } from './db-dto.js';

export interface SchemaDto extends DbDto {
  /** "{tableName}.{columnName}", set by the backend (see schemaName). */
  name?: string;
  tableName: string;
  columnName: string;
}
