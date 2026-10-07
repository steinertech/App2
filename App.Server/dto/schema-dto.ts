import { ObjectId } from 'mongodb';

export interface SchemaDto {
  _id?: ObjectId;
  /** "{tableName}.{fieldName}", set by the backend (see schemaName). */
  name?: string;
  sectorKey?: string;
  type?: string;
  tableName: string;
  fieldName: string;
}
