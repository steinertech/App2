import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { PropertyDto, PropertyOwnerEnum } from '../dto/property-dto.js';
import { sectorKeyProjectDb } from './util-main.js';

// Properties are per project: sectorKeyProjectDb (like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Owner a property is attached to (e.g. a design band: { ownerName: DesignBandDto.name, ownerEnum: PropertyOwnerEnum.DesignBand }). */
export type PropertyOwner = Required<Pick<PropertyDto, 'ownerName' | 'ownerEnum'>>;

export async function propertyLoad(request: Request): Promise<PropertyDto[]> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'PropertyDto' }).toArray();
}

/** Derives a property's name from its owner and property: ownerName + "." + ownerEnum name (e.g. "DesignBand") + "." + propertyName. */
export function propertyDtoName(property: PropertyDto): string {
  return (property.ownerName ?? '') + '.' + PropertyOwnerEnum[property.ownerEnum ?? PropertyOwnerEnum.None] + '.' + (property.propertyName ?? '');
}

/** Returns the properties attached to any of the owners (matching both ownerName and ownerEnum); none if owners is empty. */
export async function propertyLoadByOwners(request: Request, owners: PropertyOwner[]): Promise<PropertyDto[]> {
  if (owners.length === 0) {
    return [];
  }
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'PropertyDto', $or: owners.map(({ ownerName, ownerEnum }) => ({ ownerName, ownerEnum })) }).toArray();
}

/** Deletes the properties attached to any of the owners (matching both ownerName and ownerEnum); none if owners is empty. */
export async function propertyDeleteByOwners(request: Request, owners: PropertyOwner[]): Promise<void> {
  if (owners.length === 0) {
    return;
  }
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');
  await collection.deleteMany({ sectorKey: key, type: 'PropertyDto', $or: owners.map(({ ownerName, ownerEnum }) => ({ ownerName, ownerEnum })) });
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function propertyLoadByIds(request: Request, ids: string[]): Promise<PropertyDto[]> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'PropertyDto', _id: { $in: objectIds } }).toArray();
}

export async function propertyInsert(request: Request, propertyDtos: PropertyDto[]): Promise<PropertyDto[]> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');

  const properties = propertyDtos.map((propertyDto): PropertyDto => {
    const { _id, ...rest } = propertyDto;
    return { ...rest, sectorKey: key, type: 'PropertyDto' };
  });

  if (properties.length > 0) {
    await collection.insertMany(properties);
  }

  return properties;
}

/** Updates propertyDtos by _id. */
export async function propertyUpdate(request: Request, propertyDtos: PropertyDto[]): Promise<PropertyDto[]> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');

  const properties = propertyDtos
    .filter((propertyDto) => propertyDto._id !== undefined)
    .map((propertyDto): PropertyDto => ({ ...propertyDto, sectorKey: key, type: 'PropertyDto' }));

  if (properties.length > 0) {
    await collection.bulkWrite(
      properties.map(({ _id, ...property }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'PropertyDto' },
          update: { $set: property },
        },
      })),
    );
  }

  return properties;
}

/**
 * Moves the properties of each owner to ownerNameNew (same ownerEnum), renaming them by propertyDtoName.
 * All properties are loaded before any is updated, so owners may swap names.
 */
export async function propertyOwnerRename(request: Request, renames: { owner: PropertyOwner; ownerNameNew: string }[]): Promise<void> {
  const properties = await propertyLoadByOwners(request, renames.map(({ owner }) => owner));
  const updates = properties.map((property): PropertyDto => {
    const rename = renames.find(({ owner }) => owner.ownerName === property.ownerName && owner.ownerEnum === property.ownerEnum)!;
    const result: PropertyDto = { _id: property._id, ownerName: rename.ownerNameNew, ownerEnum: property.ownerEnum, propertyName: property.propertyName };
    result.name = propertyDtoName(result);
    return result;
  });
  await propertyUpdate(request, updates);
}

/**
 * Makes the properties of owner match propertyNames: inserts the missing ones (name by propertyDtoName),
 * deletes the ones not in propertyNames and keeps the others (with their propertyValue).
 */
export async function propertySync(request: Request, owner: PropertyOwner, propertyNames: string[]): Promise<void> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db().collection<PropertyDto>('myCollection');

  const existingNames = new Set((await propertyLoadByOwners(request, [owner])).map((property) => property.propertyName));

  const inserts = propertyNames
    .filter((propertyName) => !existingNames.has(propertyName))
    .map((propertyName): PropertyDto => {
      const property: PropertyDto = { ...owner, propertyName };
      property.name = propertyDtoName(property);
      return property;
    });
  await propertyInsert(request, inserts);

  await collection.deleteMany({ sectorKey: key, type: 'PropertyDto', ...owner, propertyName: { $nin: propertyNames } });
}
