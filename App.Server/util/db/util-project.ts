import client, { DB_NAME, dbInsert, dbLoad } from '../core/util-db.js';
import { ProjectDto } from '../../dto/db/project-dto.js';
import { sectorKeyDb } from '../core/util-main.js';

export async function projectsLoad(request: Request): Promise<ProjectDto[]> {
  return dbLoad<ProjectDto>(request, 'ProjectDto', false);
}

export async function projectsLoadByNames(request: Request, names: string[]): Promise<ProjectDto[]> {
  const key = await sectorKeyDb(request, 'ProjectDto');
  const collection = client.db(DB_NAME).collection<ProjectDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'ProjectDto', name: { $in: names } }).toArray();
}

export async function projectsDeleteByNames(request: Request, names: string[]): Promise<void> {
  const key = await sectorKeyDb(request, 'ProjectDto');
  const collection = client.db(DB_NAME).collection<ProjectDto>('myCollection');
  await collection.deleteMany({ sectorKey: key, type: 'ProjectDto', name: { $in: names } });
}

export async function projectsInsert(request: Request, projectDtos: ProjectDto[]): Promise<ProjectDto[]> {
  return dbInsert<ProjectDto>(request, 'ProjectDto', projectDtos, false);
}

export async function projectsUpdate(request: Request, projectDtos: ProjectDto[]): Promise<ProjectDto[]> {
  const key = await sectorKeyDb(request, 'ProjectDto');
  const collection = client.db(DB_NAME).collection<ProjectDto>('myCollection');

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
        },
      })),
    );
  }

  return projects;
}
