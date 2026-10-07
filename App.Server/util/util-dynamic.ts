import client from './util-db.js';
import { DynamicDto } from '../dto/dynamic-dto.js';
import { SchemaDto } from '../dto/schema-dto.js';
import { sectorKey } from './util-main.js';

// Like schemas, per project: sectorKey(request, true) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Returns the distinct SchemaDto.tableName values of the project. */
export async function dynamicLoad(request: Request): Promise<DynamicDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');
  const tableNames = await collection.distinct('tableName', { sectorKey: key, type: 'SchemaDto' });
  return tableNames.map((tableName): DynamicDto => ({ tableName }));
}
