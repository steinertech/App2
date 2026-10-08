import { randomUUID } from 'node:crypto';
import client from './util-db.js';
import { DesignDto } from '../dto/design-dto.js';
import { sectorKey } from './util-main.js';

// Like schemas, per project: sectorKey(request, true) also asserts the user is signed in (redirects to /sign-in otherwise).

/** Returns the rows ordered by sort. */
export async function designLoad(request: Request): Promise<DesignDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignDto' }).sort({ sort: 1, _id: 1 }).toArray();
}

/** names are DesignDto.name values (the grid's rowKeys). */
export async function designLoadByNames(request: Request, names: string[]): Promise<DesignDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignDto', name: { $in: names } }).toArray();
}

/** Inserts designDtos, each with a new random UUID as name. */
export async function designInsert(request: Request, designDtos: DesignDto[]): Promise<DesignDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignDto>('myCollection');

  const designs = designDtos.map((designDto): DesignDto => {
    const { _id, ...rest } = designDto;
    return { ...rest, name: randomUUID(), sectorKey: key, type: 'DesignDto' };
  });

  if (designs.length > 0) {
    await collection.insertMany(designs);
  }

  return designs;
}

/** Updates designDtos by name. */
export async function designUpdate(request: Request, designDtos: DesignDto[]): Promise<DesignDto[]> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignDto>('myCollection');

  const designs = designDtos
    .filter((designDto) => designDto.name !== undefined)
    .map((designDto): DesignDto => ({ ...designDto, sectorKey: key, type: 'DesignDto' }));

  if (designs.length > 0) {
    await collection.bulkWrite(
      designs.map(({ _id, ...design }) => ({
        updateOne: {
          filter: { name: design.name, sectorKey: key, type: 'DesignDto' },
          update: { $set: design },
        },
      })),
    );
  }

  return designs;
}

/** Deletes the rows by name (the grid's rowKeys). */
export async function designDeleteByNames(request: Request, names: string[]): Promise<void> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DesignDto>('myCollection');
  await collection.deleteMany({ sectorKey: key, type: 'DesignDto', name: { $in: names } });
}
