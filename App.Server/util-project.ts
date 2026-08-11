import client from './util-db';
import { ProjectDto } from './dto/project-dto';
import { sectorKey } from './util';

export async function projectList(request: Request): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto' }).toArray();
}
