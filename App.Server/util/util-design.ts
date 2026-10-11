import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DESIGN_BAND_PROPERTY_NAMES, DesignBandDto, DesignBandEnum, DesignPropertyDto } from '../dto/design-dto.js';
import { sectorKey } from './util-main.js';

// Design bands are per project: sectorKey(request, true) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function designBandLoad(request: Request): Promise<DesignBandDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignBandDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function designBandLoadByIds(request: Request, ids: string[]): Promise<DesignBandDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DesignBandDto', _id: { $in: objectIds } }).toArray();
}

/** Sets each band's name to a random UUID. */
export async function designBandInsert(request: Request, designBandDtos: DesignBandDto[]): Promise<DesignBandDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');

  const bands = designBandDtos.map((designBandDto): DesignBandDto => {
    const { _id, ...rest } = designBandDto;
    return { ...rest, name: randomUUID(), sectorKey: key, type: 'DesignBandDto' };
  });

  if (bands.length > 0) {
    await collection.insertMany(bands);
  }

  return bands;
}

/** Updates designBandDtos by _id. A band without a name gets a random UUID. */
export async function designBandUpdate(request: Request, designBandDtos: DesignBandDto[]): Promise<DesignBandDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignBandDto>('myCollection');

  const bands = designBandDtos
    .filter((designBandDto) => designBandDto._id !== undefined)
    .map((designBandDto): DesignBandDto => ({ ...designBandDto, name: designBandDto.name || randomUUID(), sectorKey: key, type: 'DesignBandDto' }));

  if (bands.length > 0) {
    await collection.bulkWrite(
      bands.map(({ _id, ...band }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DesignBandDto' },
          update: { $set: band },
        },
      })),
    );
  }

  return bands;
}

export async function designPropertyLoad(request: Request, bandName: string): Promise<DesignPropertyDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignPropertyDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignPropertyDto', bandName }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function designPropertyLoadByIds(request: Request, ids: string[]): Promise<DesignPropertyDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignPropertyDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DesignPropertyDto', _id: { $in: objectIds } }).toArray();
}

/** Updates the propertyValue of designPropertyDtos by _id; bandName and propertyName are owned by designPropertySync. */
export async function designPropertyUpdate(request: Request, designPropertyDtos: DesignPropertyDto[]): Promise<void> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignPropertyDto>('myCollection');

  const properties = designPropertyDtos.filter((designPropertyDto) => designPropertyDto._id !== undefined);

  if (properties.length > 0) {
    await collection.bulkWrite(
      properties.map(({ _id, propertyValue }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DesignPropertyDto' },
          update: { $set: { propertyValue } },
        },
      })),
    );
  }
}

/**
 * Makes the properties of band match DESIGN_BAND_PROPERTY_NAMES of its bandEnum: inserts the missing ones (name is a random UUID),
 * deletes the ones that no longer apply and keeps the others (with their propertyValue). A band without a name has no properties.
 */
export async function designPropertySync(request: Request, band: DesignBandDto): Promise<void> {
  if (!band.name) {
    return;
  }
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignPropertyDto>('myCollection');

  const propertyNames = DESIGN_BAND_PROPERTY_NAMES[band.bandEnum ?? DesignBandEnum.None] ?? [];
  const existingNames = new Set((await designPropertyLoad(request, band.name)).map((property) => property.propertyName));

  const inserts = propertyNames
    .filter((propertyName) => !existingNames.has(propertyName))
    .map((propertyName): DesignPropertyDto => ({ name: randomUUID(), sectorKey: key, type: 'DesignPropertyDto', bandName: band.name, propertyName }));
  if (inserts.length > 0) {
    await collection.insertMany(inserts);
  }

  await collection.deleteMany({ sectorKey: key, type: 'DesignPropertyDto', bandName: band.name, propertyName: { $nin: propertyNames } });
}
