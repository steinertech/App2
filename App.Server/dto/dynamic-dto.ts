import { DbDto } from './db-dto.js';

/** One row of the Data grid on the Dynamic page. Its static fields are declared here, its dynamic column values (e.g. A, B) are held in values. */
export interface DynamicDto extends DbDto {
  /** "Id/<random UUID>/", set by the backend on insert (randomUUID in util-dynamic.ts). */
  name?: string;
  tableName?: string;
  /** Column values by column name (a SchemaDto.columnName of tableName, e.g. A, B), kept apart from the static fields so a column name never collides with one of them. */
  values?: Record<string, unknown>;
}

/** One row of the Dynamic grid: a distinct SchemaDto.tableName (not persisted). */
export interface DynamicTableNameDto {
  tableName: string;
}
