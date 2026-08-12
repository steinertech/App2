import { GridDto, GridRowDto } from '../dto/grid-dto';
import { projects as fetchProjects } from './util-project';
import { users } from './util-user';
import { storageFiles } from './util-storage';

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.gridName === 'project') {
    const projects = await fetchProjects(request);
    const projectGridRows: GridRowDto[] = projects.map((project) => ({
      gridCells: [{ text: project.name }, { text: project.sectorKey }],
    }));

    const userList = await users(request);
    const userGridRows: GridRowDto[] = userList.map((user) => ({
      gridCells: [{ text: user.email }, { text: user.sectorKey }],
    }));

    return {
      ...gridDto,
      gridAreas: {
        main: { text: 'Project Data', gridRows: projectGridRows },
        user: { text: 'User Data', gridRows: userGridRows },
      },
    };
  }

  if (gridDto.gridName === 'storage') {
    const files = await storageFiles(request);
    const gridRows: GridRowDto[] = files.map((file) => ({
      gridCells: [{ text: file.fileNameOnly }, { text: file.isFolder ? 'Folder' : 'File' }],
    }));

    return {
      ...gridDto,
      gridAreas: { main: { text: 'Storage Data', gridRows } },
    };
  }

  if (gridDto.gridName === 'helloWorld') {
    return {
      ...gridDto,
      gridAreas: {
        main: {
          text: 'Hello World Data',
          gridRows: [
            { gridCells: [{ text: '1' }, { text: 'Hello' }] },
            { gridCells: [{ text: '2' }, { text: 'World' }] },
          ],
        },
      },
    };
  }

  throw new Error(`Unknown gridName: ${gridDto.gridName}`);
}
