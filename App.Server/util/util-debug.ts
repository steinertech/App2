import { ObjectId } from 'mongodb';
import client from './util-db.js';
import { DebugDto } from '../dto/debug-dto.js';
import { sectorKey } from './util-main.js';

// Debug rows are per domain (like projects): sectorKey(request, false), no sign-in required.

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

  const debugs = debugDtos.filter((debugDto) => debugDto._id !== undefined).map((debugDto): DebugDto => ({ ...debugDto, sectorKey: key, type: 'DebugDto' }));

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
