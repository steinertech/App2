import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { SchemaDto } from '../dto/schema-dto.js';
import { sectorKey } from './util-main.js';

/** Returns SchemaDto.name: "{tableName}.{fieldName}". */
function schemaName(schemaDto: SchemaDto): string {
  return `${schemaDto.tableName ?? ''}.${schemaDto.fieldName ?? ''}`;
}

// Schemas are per project: sectorKey(request, true) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function schemaLoad(request: Request): Promise<SchemaDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'SchemaDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function schemaLoadByIds(request: Request, ids: string[]): Promise<SchemaDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'SchemaDto', _id: { $in: objectIds } }).toArray();
}

export async function schemaInsert(request: Request, schemaDtos: SchemaDto[]): Promise<SchemaDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');

  const schemas = schemaDtos.map((schemaDto): SchemaDto => {
    const { _id, ...rest } = schemaDto;
    return { ...rest, name: schemaName(schemaDto), sectorKey: key, type: 'SchemaDto' };
  });

  if (schemas.length > 0) {
    await collection.insertMany(schemas);
  }

  return schemas;
}

/** Updates schemaDtos by _id (not by name, since name changes with tableName or fieldName). */
export async function schemaUpdate(request: Request, schemaDtos: SchemaDto[]): Promise<SchemaDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');

  const schemas = schemaDtos
    .filter((schemaDto) => schemaDto._id !== undefined)
    .map((schemaDto): SchemaDto => ({ ...schemaDto, name: schemaName(schemaDto), sectorKey: key, type: 'SchemaDto' }));

  if (schemas.length > 0) {
    await collection.bulkWrite(
      schemas.map(({ _id, ...schema }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'SchemaDto' },
          update: { $set: schema },
        },
      })),
    );
  }

  return schemas;
}
