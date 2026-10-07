import { ObjectId } from 'mongodb';

export interface SchemaDto {
  _id?: ObjectId;
  /** "{tableName}.{columnName}", set by the backend (see schemaName). */
  name?: string;
  sectorKey?: string;
  type?: string;
  tableName: string;
  columnName: string;
}
