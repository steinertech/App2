import { dbLoad } from '../core/util-db.js';
import { DebugDto } from '../../dto/db/debug-dto.js';

export async function debugLoad(request: Request): Promise<DebugDto[]> {
  return dbLoad<DebugDto>(request, 'DebugDto', false);
}

