import { ObjectId } from 'mongodb';
import client, { DB_NAME } from './util-db.js';
import { DebugContentDto, DebugPropertyDto } from '../dto/debug-property-dto.js';
import { sectorKeyDb } from './util-main.js';

export async function debugContentLoad(request: Request): Promise<DebugContentDto[]> {
  const key = await sectorKeyDb(request, 'DebugContentDto');
  const collection = client.db(DB_NAME).collection<DebugContentDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DebugContentDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugContentLoadByIds(request: Request, ids: string[]): Promise<DebugContentDto[]> {
  const key = await sectorKeyDb(request, 'DebugContentDto');
  const collection = client.db(DB_NAME).collection<DebugContentDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DebugContentDto', _id: { $in: objectIds } }).toArray();
}

export async function debugContentInsert(request: Request, debugContentDtos: DebugContentDto[]): Promise<DebugContentDto[]> {
  const key = await sectorKeyDb(request, 'DebugContentDto');
  const collection = client.db(DB_NAME).collection<DebugContentDto>('myCollection');

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
  const key = await sectorKeyDb(request, 'DebugContentDto');
  const collection = client.db(DB_NAME).collection<DebugContentDto>('myCollection');

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
  const key = await sectorKeyDb(request, 'DebugContentDto');
  const collection = client.db(DB_NAME).collection<DebugContentDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    await collection.deleteMany({ sectorKey: key, type: 'DebugContentDto', _id: { $in: objectIds } });
  }
}

export async function debugPropertyLoad(request: Request): Promise<DebugPropertyDto[]> {
  const key = await sectorKeyDb(request, 'DebugPropertyDto');
  const collection = client.db(DB_NAME).collection<DebugPropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DebugPropertyDto' }).toArray();
}

/** Property names every owner of an ownerType has; missing ones are inserted by debugPropertyLoadByOwners. */
const DEBUG_PROPERTY_OWNER_PROPERTY_NAMES: Record<string, string[]> = {
  Row: ['ColumnCount', 'RowCount'],
  Cell: ['IsReadOnly'],
  CellTable: ['Color', 'IsDisabled'],
};

/**
 * Returns the properties attached to any of the owners (matching both ownerName and ownerType); none if owners is empty.
 * An owner's missing DEBUG_PROPERTY_OWNER_PROPERTY_NAMES[ownerType] properties are inserted first (name by gridDebugPropertyName).
 */
export async function debugPropertyLoadByOwners(
  request: Request,
  owners: Required<Pick<DebugPropertyDto, 'ownerName' | 'ownerType'>>[],
): Promise<DebugPropertyDto[]> {
  if (owners.length === 0) {
    return [];
  }
  const key = await sectorKeyDb(request, 'DebugPropertyDto');
  const collection = client.db(DB_NAME).collection<DebugPropertyDto>('myCollection');
  const load = () =>
    collection.find({ sectorKey: key, type: 'DebugPropertyDto', $or: owners.map(({ ownerName, ownerType }) => ({ ownerName, ownerType })) }).toArray();

  const properties = await load();

  const missing = owners.flatMap(({ ownerName, ownerType }) =>
    (DEBUG_PROPERTY_OWNER_PROPERTY_NAMES[ownerType] ?? []).filter(
      (propertyName) =>
        !properties.some((property) => property.ownerName === ownerName && property.ownerType === ownerType && property.propertyName === propertyName),
    ).map((propertyName): DebugPropertyDto => {
      const property: DebugPropertyDto = { ownerName, ownerType, propertyName };
      property.name = gridDebugPropertyName(property);
      return property;
    }),
  );
  if (missing.length === 0) {
    return properties;
  }

  await debugPropertyInsert(request, missing);
  return load();
}

/**
 * Derives a property's name from its owner and property (ownerName being a path ending with "/", see gridDebugPropertyOwners):
 * ownerName + "PropertyName/<propertyName>/" if ownerType is "CellTable" (ownerName being the debug table cell),
 * otherwise ownerName + "OwnerType/<ownerType>/PropertyName/<propertyName>/".
 */
export function gridDebugPropertyName(property: DebugPropertyDto): string {
  if (property.ownerType === 'CellTable') {
    return (property.ownerName ?? '') + 'PropertyName/' + (property.propertyName ?? '') + '/';
  }
  return (property.ownerName ?? '') + 'OwnerType/' + (property.ownerType ?? '') + '/PropertyName/' + (property.propertyName ?? '') + '/';
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugPropertyLoadByIds(request: Request, ids: string[]): Promise<DebugPropertyDto[]> {
  const key = await sectorKeyDb(request, 'DebugPropertyDto');
  const collection = client.db(DB_NAME).collection<DebugPropertyDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DebugPropertyDto', _id: { $in: objectIds } }).toArray();
}

export async function debugPropertyInsert(request: Request, debugPropertyDtos: DebugPropertyDto[]): Promise<DebugPropertyDto[]> {
  const key = await sectorKeyDb(request, 'DebugPropertyDto');
  const collection = client.db(DB_NAME).collection<DebugPropertyDto>('myCollection');

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
  const key = await sectorKeyDb(request, 'DebugPropertyDto');
  const collection = client.db(DB_NAME).collection<DebugPropertyDto>('myCollection');

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
