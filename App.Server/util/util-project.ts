import client from './util-db.js';
import { ProjectDto } from '../dto/server/project-dto.js';
import { sectorKey } from './util-main.js';

export async function projects(request: Request): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto' }).toArray();
}
