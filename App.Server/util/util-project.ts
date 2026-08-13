import client from './util-db.ts';
import { ProjectDto } from '../dto/project-dto.ts';
import { sectorKey } from './util-main.ts';

export async function projects(request: Request): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto' }).toArray();
}
