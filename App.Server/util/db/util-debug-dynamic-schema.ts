import { dbLoad } from '../core/util-db.js';
import { DebugDynamicSchemaDto } from '../../dto/db/debug-dynamic-schema-dto.js';

export async function debugDynamicSchemaLoad(request: Request): Promise<DebugDynamicSchemaDto[]> {
  return dbLoad<DebugDynamicSchemaDto>(request, 'DebugDynamicSchemaDto', false);
}
