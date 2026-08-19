import client from './util-db.js';
import { ProjectDto } from '../dto/server/project-dto.js';
import { sectorKey } from './util-main.js';

export async function projectsLoad(request: Request): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto' }).toArray();
}

export async function projectsLoadByNames(request: Request, names: string[]): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto', name: { $in: names } }).toArray();
}

export async function projectsUpsert(request: Request, projectDtos: ProjectDto[]): Promise<ProjectDto[]> {
  const key = await sectorKey(request, false);
  const collection = client.db().collection<ProjectDto>('myCollection');

  const projects = projectDtos.map((projectDto): ProjectDto => {
    const { _id, ...rest } = projectDto;
    return { ...rest, sectorKey: key, type: 'ProjectDto' };
  });

  if (projects.length > 0) {
    await collection.bulkWrite(
      projects.map((project) => ({
        updateOne: {
          filter: { name: project.name, sectorKey: key, type: 'ProjectDto' },
          update: { $set: project },
          upsert: true,
        },
      })),
    );
  }

  return projects;
}
