import client from './util-db.js';
import { DebugDto } from '../dto/debug-dto.js';
import { sectorKey } from './util-main.js';

/** Saves text into the DebugDto named name (inserted if it doesn't exist yet). Signed-in only. */
export async function debugSave(request: Request, name: string, text: string): Promise<void> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DebugDto>('myCollection');
  await collection.updateOne({ sectorKey: key, type: 'DebugDto', name }, { $set: { text } }, { upsert: true });
}

/** Returns the DebugDto named name, or null if there is none. Signed-in only. */
export async function debugLoad(request: Request, name: string): Promise<DebugDto | null> {
  const key = await sectorKey(request, true);
  const collection = client.db().collection<DebugDto>('myCollection');
  return collection.findOne({ sectorKey: key, type: 'DebugDto', name });
}
