import client from './util-db.js';
import { ProjectDto } from '../dto/server/project-dto.js';
import { sectorKey } from './util-main.js';

export async function projectsLoad(request: Request): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto' }).toArray();
}

export async function projectsUpsert(request: Request, projectDto: ProjectDto): Promise<ProjectDto> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');

  const { _id, ...rest } = projectDto;
  const project: ProjectDto = { ...rest, sectorKey: key, type: 'ProjectDto' };

  await collection.updateOne({ name: project.name, sectorKey: key, type: 'ProjectDto' }, { $set: project }, { upsert: true });

  return project;
}
