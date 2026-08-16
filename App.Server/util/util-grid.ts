import { GridCellDto, GridCellEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto } from '../dto/web/grid-dto.js';
import { projectsLoad } from './util-project.js';
import { usersLoad } from './util-user.js';
import { storageFiles } from './util-storage.js';
import { StorageFileDto } from '../dto/web/storage-file-dto.js';
import { ProjectDto } from '../dto/server/project-dto.js';
import { UserDto } from '../dto/server/user-dto.js';

const STORAGE_FILE_COLUMNS: (keyof StorageFileDto)[] = ['fileName', 'fileNameOnly', 'isFolder'];
const PROJECT_COLUMNS = ['name', 'sectorKey'] as const satisfies (keyof ProjectDto)[];
const USER_COLUMNS = ['email', 'sectorKey'] as const satisfies (keyof UserDto)[];

async function gridLoadStorage(request: Request): Promise<GridRowDto[]> {
  const files = await storageFiles(request);

  const headerRow: GridRowDto = {
    gridCells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column })),
  };

  const fileRows: GridRowDto[] = files.map((file, rowIndex) => ({
    gridCells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: String(file[column]), rowIndex })),
  }));

  return [headerRow, ...fileRows];
}

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.gridName === 'project') {
    const projects = await projectsLoad(request);
    const projectHeaderRow: GridRowDto = {
      gridCells: [
        ...PROJECT_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column })),
        { gridCellEnum: GridCellEnum.Header, text: 'Command' },
      ],
    };
    const projectGridRows: GridRowDto[] = projects.map((project, rowIndex) => ({
      gridCells: [
        ...PROJECT_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: project[column], rowIndex })),
        {
          gridCellEnum: GridCellEnum.Custom,
          gridCustoms: [{ text: 'Switch', gridCustomEnum: GridCustomEnum.Button } satisfies GridCustomDto],
          rowIndex,
        },
      ],
    }));

    const users = await usersLoad(request);
    const userHeaderRow: GridRowDto = {
      gridCells: USER_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column })),
    };
    const userGridRows: GridRowDto[] = users.map((user, rowIndex) => ({
      gridCells: USER_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: user[column], rowIndex })),
    }));

    return {
      ...gridDto,
      gridAreas: {
        main: { text: 'Project Data', gridRows: [projectHeaderRow, ...projectGridRows] },
        user: { text: 'User Data', gridRows: [userHeaderRow, ...userGridRows] },
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
            { gridCells: [{ text: '1', rowIndex: 0 }, { text: 'Hello', rowIndex: 0 }] },
            { gridCells: [{ text: '2', rowIndex: 1 }, { text: 'World', rowIndex: 1 }] },
          ],
        },
      },
    };
  }

  throw new Error(`Unknown gridName: ${gridDto.gridName}`);
}
