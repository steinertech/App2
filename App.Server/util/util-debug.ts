import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DebugDto, DebugPropertyDto } from '../dto/debug-dto.js';
import { sectorKey } from './util-main.js';

export async function debugLoad(request: Request): Promise<DebugDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DebugDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugLoadByIds(request: Request, ids: string[]): Promise<DebugDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DebugDto', _id: { $in: objectIds } }).toArray();
}

export async function debugInsert(request: Request, debugDtos: DebugDto[]): Promise<DebugDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugDto>('myCollection');

  const debugs = debugDtos.map((debugDto): DebugDto => {
    const { _id, ...rest } = debugDto;
    return { ...rest, sectorKey: key, type: 'DebugDto' };
  });

  if (debugs.length > 0) {
    await collection.insertMany(debugs);
  }

  return debugs;
}

/** Updates debugDtos by _id. */
export async function debugUpdate(request: Request, debugDtos: DebugDto[]): Promise<DebugDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugDto>('myCollection');

  const debugs = debugDtos
    .filter((debugDto) => debugDto._id !== undefined)
    .map((debugDto): DebugDto => ({ ...debugDto, sectorKey: key, type: 'DebugDto' }));

  if (debugs.length > 0) {
    await collection.bulkWrite(
      debugs.map(({ _id, ...debug }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DebugDto' },
          update: { $set: debug },
        },
      })),
    );
  }

  return debugs;
}

/** Deletes the debugs by ids (ObjectId hex strings, the grid's rowKeys); invalid ones are ignored. */
export async function debugDelete(request: Request, ids: string[]): Promise<void> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    await collection.deleteMany({ sectorKey: key, type: 'DebugDto', _id: { $in: objectIds } });
  }
}

export async function debugPropertyLoad(request: Request): Promise<DebugPropertyDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugPropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DebugPropertyDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugPropertyLoadByIds(request: Request, ids: string[]): Promise<DebugPropertyDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugPropertyDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DebugPropertyDto', _id: { $in: objectIds } }).toArray();
}

export async function debugPropertyInsert(request: Request, debugPropertyDtos: DebugPropertyDto[]): Promise<DebugPropertyDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugPropertyDto>('myCollection');

  const properties = debugPropertyDtos.map((debugPropertyDto): DebugPropertyDto => {
    const { _id, ...rest } = debugPropertyDto;
    return { ...rest, sectorKey: key, type: 'DebugPropertyDto' };
  });

  if (properties.length > 0) {
    await collection.insertMany(properties);
  }

  return properties;
}

/** Updates debugPropertyDtos by _id. */
export async function debugPropertyUpdate(request: Request, debugPropertyDtos: DebugPropertyDto[]): Promise<DebugPropertyDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugPropertyDto>('myCollection');

  const properties = debugPropertyDtos
    .filter((debugPropertyDto) => debugPropertyDto._id !== undefined)
    .map((debugPropertyDto): DebugPropertyDto => ({ ...debugPropertyDto, sectorKey: key, type: 'DebugPropertyDto' }));

  if (properties.length > 0) {
    await collection.bulkWrite(
      properties.map(({ _id, ...property }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DebugPropertyDto' },
          update: { $set: property },
        },
      })),
    );
  }

  return properties;
}
