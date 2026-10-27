import { randomUUID } from 'node:crypto';
import client, { DB_NAME, dbInsert, dbLoad, dbLoadByIds, dbUpdate } from './util-db.js';
import { DynamicDto, DynamicTableNameDto } from '../dto/db/dynamic-dto.js';
import { SchemaDto } from '../dto/db/schema-dto.js';
import { sectorKeyProjectDb } from './util-main.js';

// Like schemas, per project: sectorKeyProjectDb (the default of the db functions; like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Returns the distinct SchemaDto.tableName values of the project. */
export async function dynamicTableLoad(request: Request): Promise<DynamicTableNameDto[]> {
  const key = await sectorKeyProjectDb(request, 'SchemaDto');
  const collection = client.db(DB_NAME).collection<SchemaDto>('myCollection');
  const tableNames = await collection.distinct('tableName', { sectorKey: key, type: 'SchemaDto' });
  return tableNames.map((tableName): DynamicTableNameDto => ({ tableName }));
}

/** Returns the SchemaDto.columnName values of tableName, in creation order. */
export async function dynamicColumnNameLoad(request: Request, tableName: string): Promise<string[]> {
  const key = await sectorKeyProjectDb(request, 'SchemaDto');
  const collection = client.db(DB_NAME).collection<SchemaDto>('myCollection');
  const schemas = await collection.find({ sectorKey: key, type: 'SchemaDto', tableName }).sort({ _id: 1 }).toArray();
  return schemas.map((schema) => schema.columnName);
}

// DynamicDto documents carry their column values (e.g. A, B) in DynamicDto.values, which is read and written along with the static fields.

/** Returns the rows with tableName, or all rows if tableName is undefined. */
export async function dynamicLoad(request: Request, tableName?: string): Promise<DynamicDto[]> {
  if (tableName === undefined) {
    return dbLoad<DynamicDto>(request, 'DynamicDto');
  }
  const key = await sectorKeyProjectDb(request, 'DynamicDto');
  const collection = client.db(DB_NAME).collection<DynamicDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DynamicDto', tableName }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function dynamicLoadByIds(request: Request, ids: string[]): Promise<DynamicDto[]> {
  return dbLoadByIds<DynamicDto>(request, 'DynamicDto', ids);
}

export async function dynamicInsert(request: Request, dynamicDtos: DynamicDto[]): Promise<DynamicDto[]> {
  return dbInsert<DynamicDto>(request, 'DynamicDto', dynamicDtos.map((dynamicDto) => ({ ...dynamicDto, name: 'Id/' + randomUUID() + '/' })));
}

/** Updates dynamicDtos by _id. */
export async function dynamicUpdate(request: Request, dynamicDtos: DynamicDto[]): Promise<DynamicDto[]> {
  return dbUpdate<DynamicDto>(request, 'DynamicDto', dynamicDtos);
}
