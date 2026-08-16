import { GridAreaDto, GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto } from '../dto/web/grid-dto.js';
import { projectsLoad } from './util-project.js';
import { usersLoad, userProject } from './util-user.js';
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
    cells: [
      ...PROJECT_COLUMNS.map((column): GridCellDto => ({ cellEnum: GridCellEnum.Header, text: column, columnName: column })),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = projects.map((project, rowIndex) => ({
    cells: [
      ...PROJECT_COLUMNS.map((column): GridCellDto => ({ cellEnum: GridCellEnum.Text, text: project[column], rowIndex, columnName: column })),
      {
        cellEnum: GridCellEnum.Custom,
        customs: [{ text: 'Switch', name: 'Switch', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto],
        rowIndex,
      },
    ],
  }));

  const rowKeys = projects.map((project) => project.name ?? '');

  return { ...gridAreaDto, text: 'Project Data', rows: [headerRow, ...rows], rowKeys };
}

async function gridLoadProjectCommand(request: Request, gridAreaDto: GridAreaDto): Promise<void> {
  if (gridAreaDto.command?.commandEnum !== GridCommandEnum.CustomButtonClick) {
    return;
  }

  const rowIndex = gridAreaDto.command.rowIndex;
  if (rowIndex === undefined) {
    return;
  }

  const projectName = gridAreaDto.rowKeys?.[rowIndex];
  if (projectName === undefined) {
    return;
  }

  await userProject(request, projectName);
}

async function gridLoadUser(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    cells: USER_COLUMNS.map((column): GridCellDto => ({ cellEnum: GridCellEnum.Header, text: column, columnName: column })),
  };
  const rows: GridRowDto[] = users.map((user, rowIndex) => ({
    cells: USER_COLUMNS.map((column): GridCellDto => ({ cellEnum: GridCellEnum.Text, text: user[column], rowIndex, columnName: column })),
  }));

  return { ...gridAreaDto, text: 'User Data', rows: [headerRow, ...rows] };
}

async function gridLoadStorage(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const files = await storageFiles(request);

  const headerRow: GridRowDto = {
    cells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ cellEnum: GridCellEnum.Header, text: column, columnName: column })),
  };
  const fileRows: GridRowDto[] = files.map((file, rowIndex) => ({
    cells: STORAGE_FILE_COLUMNS.map((column): GridCellDto => ({ cellEnum: GridCellEnum.Text, text: String(file[column]), rowIndex, columnName: column })),
  }));

  return { ...gridAreaDto, text: 'Storage Data', rows: [headerRow, ...fileRows] };
}

async function gridLoadHelloWorld(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  return {
    ...gridAreaDto,
    text: 'Hello World Data',
    rows: [
      { cells: [{ text: '1', rowIndex: 0 }, { text: 'Hello', rowIndex: 0 }] },
      { cells: [{ text: '2', rowIndex: 1 }, { text: 'World', rowIndex: 1 }] },
    ],
  };
}

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  for (const gridAreaDto of gridDto.areas ?? []) {
    if (gridAreaDto.gridName === 'project') {
      await gridLoadProjectCommand(request, gridAreaDto);
    }
  }

  const areas = await Promise.all(
    (gridDto.areas ?? []).map((gridAreaDto): Promise<GridAreaDto> => {
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

  return { ...gridDto, areas };
}
