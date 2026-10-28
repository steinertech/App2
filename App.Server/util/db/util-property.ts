import client, { DB_NAME, dbInsert, dbLoad, dbLoadByFilter, dbLoadByIds, dbUpdate } from '../core/util-db.js';
import { PropertyDto, PropertyOwnerEnum } from '../../dto/db/property-dto.js';
import { sectorKeyProjectDb } from '../core/util-main.js';

// Properties are per project: sectorKeyProjectDb (the default of the db functions; like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Owner a property is attached to (e.g. a design band: { ownerName: DesignBandDto.name, ownerEnum: PropertyOwnerEnum.DesignBand }). */
export type PropertyOwner = Required<Pick<PropertyDto, 'ownerName' | 'ownerEnum'>>;

export async function propertyLoad(request: Request): Promise<PropertyDto[]> {
  return dbLoad<PropertyDto>(request, 'PropertyDto');
}

/**
 * Derives a property's name from its owner and property: ownerName (itself a name ending with "/", e.g. DesignBandDto.name)
 * + "OwnerEnum/<ownerEnum name, e.g. DesignBand>/PropertyName/<propertyName>/".
 */
export function propertyDtoName(property: PropertyDto): string {
  return (property.ownerName ?? '') + 'OwnerEnum/' + PropertyOwnerEnum[property.ownerEnum ?? PropertyOwnerEnum.None] + '/PropertyName/' + (property.propertyName ?? '') + '/';
}

/** Returns the properties attached to any of the owners (matching both ownerName and ownerEnum); none if owners is empty. */
export async function propertyLoadByOwners(request: Request, owners: PropertyOwner[]): Promise<PropertyDto[]> {
  if (owners.length === 0) {
    return [];
  }
  return dbLoadByFilter<PropertyDto>(request, 'PropertyDto', { $or: owners.map(({ ownerName, ownerEnum }) => ({ ownerName, ownerEnum })) });
}

/** Deletes the properties attached to any of the owners (matching both ownerName and ownerEnum); none if owners is empty. */
export async function propertyDeleteByOwners(request: Request, owners: PropertyOwner[]): Promise<void> {
  if (owners.length === 0) {
    return;
  }
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db(DB_NAME).collection<PropertyDto>('myCollection');
  await collection.deleteMany({ sectorKey: key, type: 'PropertyDto', $or: owners.map(({ ownerName, ownerEnum }) => ({ ownerName, ownerEnum })) });
}

/** Returns the properties of ownerEnum whose ownerName matches ownerNameRegex (e.g. all cells of a design form). */
export async function propertyLoadByOwnerNameRegex(request: Request, ownerEnum: PropertyOwnerEnum, ownerNameRegex: RegExp): Promise<PropertyDto[]> {
  return dbLoadByFilter<PropertyDto>(request, 'PropertyDto', { ownerEnum, ownerName: { $regex: ownerNameRegex } });
}

/** Deletes the properties of ownerEnum whose ownerName matches ownerNameRegex (e.g. all cells of a design form). */
export async function propertyDeleteByOwnerNameRegex(request: Request, ownerEnum: PropertyOwnerEnum, ownerNameRegex: RegExp): Promise<void> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db(DB_NAME).collection<PropertyDto>('myCollection');
  await collection.deleteMany({ sectorKey: key, type: 'PropertyDto', ownerEnum, ownerName: { $regex: ownerNameRegex } });
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function propertyLoadByIds(request: Request, ids: string[]): Promise<PropertyDto[]> {
  return dbLoadByIds<PropertyDto>(request, 'PropertyDto', ids);
}

export async function propertyInsert(request: Request, propertyDtos: PropertyDto[]): Promise<PropertyDto[]> {
  return dbInsert<PropertyDto>(request, 'PropertyDto', propertyDtos);
}

/** Updates propertyDtos by _id. */
export async function propertyUpdate(request: Request, propertyDtos: PropertyDto[]): Promise<PropertyDto[]> {
  return dbUpdate<PropertyDto>(request, 'PropertyDto', propertyDtos);
}

/**
 * Makes the properties of owner match propertyNames: inserts the missing ones (name by propertyDtoName),
 * deletes the ones not in propertyNames and keeps the others (with their propertyValue).
 */
export async function propertySync(request: Request, owner: PropertyOwner, propertyNames: string[]): Promise<void> {
  const key = await sectorKeyProjectDb(request, 'PropertyDto');
  const collection = client.db(DB_NAME).collection<PropertyDto>('myCollection');

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
