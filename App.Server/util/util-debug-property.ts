import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DebugContentDto, DebugPropertyDto } from '../dto/debug-property-dto.js';
import { sectorKey } from './util-main.js';

export async function debugContentLoad(request: Request): Promise<DebugContentDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugContentDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DebugContentDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugContentLoadByIds(request: Request, ids: string[]): Promise<DebugContentDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugContentDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DebugContentDto', _id: { $in: objectIds } }).toArray();
}

export async function debugContentInsert(request: Request, debugContentDtos: DebugContentDto[]): Promise<DebugContentDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugContentDto>('myCollection');

  const contents = debugContentDtos.map((debugContentDto): DebugContentDto => {
    const { _id, ...rest } = debugContentDto;
    return { ...rest, sectorKey: key, type: 'DebugContentDto' };
  });

  if (contents.length > 0) {
    await collection.insertMany(contents);
  }

  return contents;
}

/** Updates debugContentDtos by _id. */
export async function debugContentUpdate(request: Request, debugContentDtos: DebugContentDto[]): Promise<DebugContentDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugContentDto>('myCollection');

  const contents = debugContentDtos
    .filter((debugContentDto) => debugContentDto._id !== undefined)
    .map((debugContentDto): DebugContentDto => ({ ...debugContentDto, sectorKey: key, type: 'DebugContentDto' }));

  if (contents.length > 0) {
    await collection.bulkWrite(
      contents.map(({ _id, ...content }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DebugContentDto' },
          update: { $set: content },
        },
      })),
    );
  }

  return contents;
}

/** Deletes the debug contents by ids (ObjectId hex strings, the grid's rowKeys); invalid ones are ignored. */
export async function debugContentDelete(request: Request, ids: string[]): Promise<void> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugContentDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    await collection.deleteMany({ sectorKey: key, type: 'DebugContentDto', _id: { $in: objectIds } });
  }
}

export async function debugPropertyLoad(request: Request): Promise<DebugPropertyDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugPropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DebugPropertyDto' }).toArray();
}

/** Returns the properties attached to any of the owners (matching both ownerName and ownerType); none if owners is empty. */
export async function debugPropertyLoadByOwners(
  request: Request,
  owners: Required<Pick<DebugPropertyDto, 'ownerName' | 'ownerType'>>[],
): Promise<DebugPropertyDto[]> {
  if (owners.length === 0) {
    return [];
  }
  const key = await sectorKey(request, false);
  const collection = client.db().collection<DebugPropertyDto>('myCollection');
  return collection
    .find({ sectorKey: key, type: 'DebugPropertyDto', $or: owners.map(({ ownerName, ownerType }) => ({ ownerName, ownerType })) })
    .toArray();
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
