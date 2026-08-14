import { GridCellDto, GridCellEnum, GridDto, GridRowDto } from '../dto/web/grid-dto.js';
import { projects as fetchProjects } from './util-project.js';
import { users } from './util-user.js';
import { storageFiles } from './util-storage.js';
import { StorageFileDto } from '../dto/web/storage-file-dto.js';

const STORAGE_FILE_COLUMNS: (keyof StorageFileDto)[] = ['fileName', 'fileNameOnly', 'isFolder'];

async function gridLoadStorage(request: Request): Promise<GridRowDto[]> {
  const files = await storageFiles(request);

  const headerRow: GridRowDto = {
    gridCells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column })),
  };

  const fileRows: GridRowDto[] = files.map((file) => ({
    gridCells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: String(file[column]) })),
  }));

  return [headerRow, ...fileRows];
}

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
    const gridRows = await gridLoadStorage(request);

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
