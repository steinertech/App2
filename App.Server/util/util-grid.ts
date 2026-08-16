import { GridAreaDto, GridCellDto, GridCellEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto } from '../dto/web/grid-dto.js';
import { projectsLoad } from './util-project.js';
import { usersLoad } from './util-user.js';
import { storageFiles } from './util-storage.js';
import { StorageFileDto } from '../dto/web/storage-file-dto.js';
import { ProjectDto } from '../dto/server/project-dto.js';
import { UserDto } from '../dto/server/user-dto.js';

const STORAGE_FILE_COLUMNS: (keyof StorageFileDto)[] = ['fileName', 'fileNameOnly', 'isFolder'];
const PROJECT_COLUMNS = ['name', 'sectorKey'] as const satisfies (keyof ProjectDto)[];
const USER_COLUMNS = ['email', 'sectorKey'] as const satisfies (keyof UserDto)[];

async function gridLoadProject(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const projects = await projectsLoad(request);

  const headerRow: GridRowDto = {
    gridCells: [
      ...PROJECT_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column, columnName: column })),
      { gridCellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const gridRows: GridRowDto[] = projects.map((project, rowIndex) => ({
    gridCells: [
      ...PROJECT_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: project[column], rowIndex, columnName: column })),
      {
        gridCellEnum: GridCellEnum.Custom,
        gridCustoms: [{ text: 'Switch', name: 'Switch', gridCustomEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto],
        rowIndex,
      },
    ],
  }));

  return { ...gridAreaDto, text: 'Project Data', gridRows: [headerRow, ...gridRows] };
}

async function gridLoadUser(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    gridCells: USER_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column, columnName: column })),
  };
  const gridRows: GridRowDto[] = users.map((user, rowIndex) => ({
    gridCells: USER_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: user[column], rowIndex, columnName: column })),
  }));

  return { ...gridAreaDto, text: 'User Data', gridRows: [headerRow, ...gridRows] };
}

async function gridLoadStorage(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const files = await storageFiles(request);

  const headerRow: GridRowDto = {
    gridCells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Header, text: column, columnName: column })),
  };
  const fileRows: GridRowDto[] = files.map((file, rowIndex) => ({
    gridCells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ gridCellEnum: GridCellEnum.Text, text: String(file[column]), rowIndex, columnName: column })),
  }));

  return { ...gridAreaDto, text: 'Storage Data', gridRows: [headerRow, ...fileRows] };
}

async function gridLoadHelloWorld(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  return {
    ...gridAreaDto,
    text: 'Hello World Data',
    gridRows: [
      { gridCells: [{ text: '1', rowIndex: 0 }, { text: 'Hello', rowIndex: 0 }] },
      { gridCells: [{ text: '2', rowIndex: 1 }, { text: 'World', rowIndex: 1 }] },
    ],
  };
}

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  const gridAreas = await Promise.all(
    (gridDto.gridAreas ?? []).map((gridAreaDto): Promise<GridAreaDto> => {
      if (gridAreaDto.gridName === 'project') {
        return gridLoadProject(request, gridAreaDto);
      }
      if (gridAreaDto.gridName === 'user') {
        return gridLoadUser(request, gridAreaDto);
      }
      if (gridAreaDto.gridName === 'storage') {
        return gridLoadStorage(request, gridAreaDto);
      }
      if (gridAreaDto.gridName === 'helloWorld') {
        return gridLoadHelloWorld(request, gridAreaDto);
      }
      throw new Error(`Unknown gridName: ${gridAreaDto.gridName}`);
    }),
  );

  return { ...gridDto, gridAreas };
}
