import { DbDto } from './db-dto.js';

/** One row of the Data grid on the Dynamic page. Its column values (e.g. A, B) are stored as additional fields of the document, not declared here. */
export interface DynamicDto extends DbDto {
  /** Random UUID, set by the backend on insert (randomUUID in util-dynamic.ts). */
  name?: string;
  tableName?: string;
}

/** One row of the Dynamic grid: a distinct SchemaDto.tableName (not persisted). */
export interface DynamicTableNameDto {
  tableName: string;
}
