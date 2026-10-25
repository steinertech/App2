import { DbDto } from './db-dto.js';

export interface SchemaDto extends DbDto {
  /** "TableName/{tableName}/ColumnName/{columnName}/", set by the backend (see schemaName). */
  name?: `TableName/${string}/ColumnName/${string}/`;
  tableName: string;
  columnName: string;
}
