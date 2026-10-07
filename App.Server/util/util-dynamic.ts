import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DynamicDto, DynamicTableNameDto } from '../dto/dynamic-dto.js';
import { SchemaDto } from '../dto/schema-dto.js';
import { sectorKey } from './util-main.js';

// Like schemas, per project: sectorKey(request, true) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Returns the distinct SchemaDto.tableName values of the project. */
export async function dynamicTableLoad(request: Request): Promise<DynamicTableNameDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');
  const tableNames = await collection.distinct('tableName', { sectorKey: key, type: 'SchemaDto' });
  return tableNames.map((tableName): DynamicTableNameDto => ({ tableName }));
}

/** Returns the SchemaDto.columnName values of tableName, in creation order. */
export async function dynamicColumnNameLoad(request: Request, tableName: string): Promise<string[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<SchemaDto>('myCollection');
  const schemas = await collection.find({ sectorKey: key, type: 'SchemaDto', tableName }).sort({ _id: 1 }).toArray();
  return schemas.map((schema) => schema.columnName);
}

// DynamicDto documents carry their column values (e.g. A, B) as additional fields, which are read and written along with the declared ones.

/** Returns the rows with tableName, or all rows if tableName is undefined. */
export async function dynamicLoad(request: Request, tableName?: string): Promise<DynamicDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DynamicDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DynamicDto', ...(tableName !== undefined && { tableName }) }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function dynamicLoadByIds(request: Request, ids: string[]): Promise<DynamicDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DynamicDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DynamicDto', _id: { $in: objectIds } }).toArray();
}

export async function dynamicInsert(request: Request, dynamicDtos: DynamicDto[]): Promise<DynamicDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DynamicDto>('myCollection');

  const dynamics = dynamicDtos.map((dynamicDto): DynamicDto => {
    const { _id, ...rest } = dynamicDto;
    return { ...rest, name: randomUUID(), sectorKey: key, type: 'DynamicDto' };
  });

  if (dynamics.length > 0) {
    await collection.insertMany(dynamics);
  }

  return dynamics;
}

/** Updates dynamicDtos by _id. */
export async function dynamicUpdate(request: Request, dynamicDtos: DynamicDto[]): Promise<DynamicDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DynamicDto>('myCollection');

  const dynamics = dynamicDtos
    .filter((dynamicDto) => dynamicDto._id !== undefined)
    .map((dynamicDto): DynamicDto => ({ ...dynamicDto, sectorKey: key, type: 'DynamicDto' }));

  if (dynamics.length > 0) {
    await collection.bulkWrite(
      dynamics.map(({ _id, ...dynamic }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DynamicDto' },
          update: { $set: dynamic },
        },
      })),
    );
  }

  return dynamics;
}
