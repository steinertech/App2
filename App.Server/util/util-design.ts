import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DesignBandDto } from '../dto/design-dto.js';
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
