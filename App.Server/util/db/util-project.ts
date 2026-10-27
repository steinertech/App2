import { dbDelete, dbInsert, dbLoad, dbLoadByIds, dbUpdate } from '../core/util-db.js';
import { ProjectDto } from '../../dto/db/project-dto.js';

// Projects are global (sectorKeyDb): they are looked up by domain, without a selected project.

export async function projectsLoad(request: Request): Promise<ProjectDto[]> {
  return dbLoad<ProjectDto>(request, 'ProjectDto', false);
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function projectsLoadByIds(request: Request, ids: string[]): Promise<ProjectDto[]> {
  return dbLoadByIds<ProjectDto>(request, 'ProjectDto', ids, false);
}

/** Deletes the projects by ids (ObjectId hex strings, the grid's rowKeys); invalid ones are ignored. */
export async function projectsDelete(request: Request, ids: string[]): Promise<void> {
  return dbDelete(request, 'ProjectDto', ids, false);
}

export async function projectsInsert(request: Request, projectDtos: ProjectDto[]): Promise<ProjectDto[]> {
  return dbInsert<ProjectDto>(request, 'ProjectDto', projectDtos, false);
}

/** Updates projectDtos by _id (not by name, since name is editable). */
export async function projectsUpdate(request: Request, projectDtos: ProjectDto[]): Promise<ProjectDto[]> {
  return dbUpdate<ProjectDto>(request, 'ProjectDto', projectDtos, false);
}
