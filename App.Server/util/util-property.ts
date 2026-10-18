import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { PropertyDto } from '../dto/property-dto.js';
import { sectorKey } from './util-main.js';

// Properties are per project: sectorKey(request, true) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Owner a property is attached to (e.g. a design band: { ownerName: DesignBandDto.name, ownerType: 'DesignBand' }). */
export type PropertyOwner = Required<Pick<PropertyDto, 'ownerName' | 'ownerType'>>;

export async function propertyLoad(request: Request): Promise<PropertyDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<PropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'PropertyDto' }).toArray();
}

/** Derives a property's name from its owner and property: ownerName + "." + ownerType + "." + propertyName. */
export function propertyDtoName(property: PropertyDto): string {
  return (property.ownerName ?? '') + '.' + (property.ownerType ?? '') + '.' + (property.propertyName ?? '');
}

/** Returns the properties attached to any of the owners (matching both ownerName and ownerType); none if owners is empty. */
export async function propertyLoadByOwners(request: Request, owners: PropertyOwner[]): Promise<PropertyDto[]> {
  if (owners.length === 0) {
    return [];
  }
  const key = await sectorKey(request, true);
  const collection = client.db().collection<PropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'PropertyDto', $or: owners.map(({ ownerName, ownerType }) => ({ ownerName, ownerType })) }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function propertyLoadByIds(request: Request, ids: string[]): Promise<PropertyDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<PropertyDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'PropertyDto', _id: { $in: objectIds } }).toArray();
}

export async function propertyInsert(request: Request, propertyDtos: PropertyDto[]): Promise<PropertyDto[]> {
  const key = await sectorKey(request, true);
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
  const key = await sectorKey(request, true);
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
 * Makes the properties of owner match propertyNames: inserts the missing ones (name by propertyDtoName),
 * deletes the ones not in propertyNames and keeps the others (with their propertyValue).
 */
export async function propertySync(request: Request, owner: PropertyOwner, propertyNames: string[]): Promise<void> {
  const key = await sectorKey(request, true);
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
