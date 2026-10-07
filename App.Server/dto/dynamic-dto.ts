import { ObjectId } from 'mongodb';

/** One row of the Data grid on the Dynamic page. Its column values (e.g. A, B) are stored as additional fields of the document, not declared here. */
export interface DynamicDto {
  _id?: ObjectId;
  name?: string;
  sectorKey?: string;
  type?: string;
}

/** One row of the Dynamic grid: a distinct SchemaDto.tableName (not persisted). */
export interface DynamicTableNameDto {
  tableName: string;
}
