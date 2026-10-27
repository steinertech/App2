import { dbLoad } from '../core/util-db.js';
import { DebugDynamicDto } from '../../dto/db/debug-dynamic-dto.js';

export async function debugDynamicLoad(request: Request): Promise<DebugDynamicDto[]> {
  return dbLoad<DebugDynamicDto>(request, 'DebugDynamicDto', false);
}
