import { dbDelete, dbInsert, dbLoad, dbLoadByIds, dbUpdate } from './util-db.js';
import { DebugDto } from '../dto/debug-dto.js';

export async function debugLoad(request: Request): Promise<DebugDto[]> {
  return dbLoad<DebugDto>(request, 'DebugDto', false);
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function debugLoadByIds(request: Request, ids: string[]): Promise<DebugDto[]> {
  return dbLoadByIds<DebugDto>(request, 'DebugDto', ids, false);
}

export async function debugInsert(request: Request, debugDtos: DebugDto[]): Promise<DebugDto[]> {
  return dbInsert<DebugDto>(request, 'DebugDto', debugDtos, false);
}

/** Updates debugDtos by _id. */
export async function debugUpdate(request: Request, debugDtos: DebugDto[]): Promise<DebugDto[]> {
  return dbUpdate<DebugDto>(request, 'DebugDto', debugDtos, false);
}

/** Deletes the debugs by ids (ObjectId hex strings, the grid's rowKeys); invalid ones are ignored. */
export async function debugDelete(request: Request, ids: string[]): Promise<void> {
  return dbDelete(request, 'DebugDto', ids, false);
}
