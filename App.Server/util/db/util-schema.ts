import { dbInsert, dbLoad, dbUpdate } from '../core/util-db.js';
import { SchemaDto } from '../../dto/db/schema-dto.js';

/** Returns SchemaDto.name: "TableName/{tableName}/ColumnName/{columnName}/". */
function schemaName(schemaDto: SchemaDto): `TableName/${string}/ColumnName/${string}/` {
  return `TableName/${schemaDto.tableName ?? ''}/ColumnName/${schemaDto.columnName ?? ''}/`;
}

// Schemas are per project: sectorKeyProjectDb (the default of the db functions; like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function schemaLoad(request: Request): Promise<SchemaDto[]> {
  return dbLoad<SchemaDto>(request, 'SchemaDto');
}

export async function schemaInsert(request: Request, schemaDtos: SchemaDto[]): Promise<SchemaDto[]> {
  return dbInsert<SchemaDto>(request, 'SchemaDto', schemaDtos.map((schemaDto) => ({ ...schemaDto, name: schemaName(schemaDto) })));
}

/** Updates schemaDtos by _id (not by name, since name changes with tableName or columnName). */
export async function schemaUpdate(request: Request, schemaDtos: SchemaDto[]): Promise<SchemaDto[]> {
  return dbUpdate<SchemaDto>(request, 'SchemaDto', schemaDtos.map((schemaDto) => ({ ...schemaDto, name: schemaName(schemaDto) })));
}
