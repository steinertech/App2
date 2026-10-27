import { dbInsert, dbLoad, dbLoadByIds, dbUpdate } from './util-db.js';
import { SchemaDto } from '../dto/db/schema-dto.js';

/** Returns SchemaDto.name: "TableName/{tableName}/ColumnName/{columnName}/". */
function schemaName(schemaDto: SchemaDto): `TableName/${string}/ColumnName/${string}/` {
  return `TableName/${schemaDto.tableName ?? ''}/ColumnName/${schemaDto.columnName ?? ''}/`;
}

// Schemas are per project: sectorKeyProjectDb (the default of the db functions; like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function schemaLoad(request: Request): Promise<SchemaDto[]> {
  return dbLoad<SchemaDto>(request, 'SchemaDto');
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function schemaLoadByIds(request: Request, ids: string[]): Promise<SchemaDto[]> {
  return dbLoadByIds<SchemaDto>(request, 'SchemaDto', ids);
}

export async function schemaInsert(request: Request, schemaDtos: SchemaDto[]): Promise<SchemaDto[]> {
  return dbInsert<SchemaDto>(request, 'SchemaDto', schemaDtos.map((schemaDto) => ({ ...schemaDto, name: schemaName(schemaDto) })));
}

/** Updates schemaDtos by _id (not by name, since name changes with tableName or columnName). */
export async function schemaUpdate(request: Request, schemaDtos: SchemaDto[]): Promise<SchemaDto[]> {
  return dbUpdate<SchemaDto>(request, 'SchemaDto', schemaDtos.map((schemaDto) => ({ ...schemaDto, name: schemaName(schemaDto) })));
}
