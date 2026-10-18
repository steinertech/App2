import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DebugContentDto } from '../dto/debug-property-dto.js';
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
