import { GridAreaDto, GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto, GridStateSortDto } from '../dto/web/grid-dto.js';
import { projectsLoad } from './util-project.js';
import { usersLoad, userProject } from './util-user.js';
import { storageFiles } from './util-storage.js';
import { StorageFileDto } from '../dto/web/storage-file-dto.js';
import { ProjectDto } from '../dto/server/project-dto.js';
import { UserDto } from '../dto/server/user-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/server/grid-config-dto.js';

const STORAGE_FILE_COLUMNS: GridConfigDto = {
  columns: (['fileName', 'fileNameOnly', 'isFolder'] as const satisfies readonly (keyof StorageFileDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};
const PROJECT_COLUMNS: GridConfigDto = {
  columns: (['name', 'sectorKey'] as const satisfies readonly (keyof ProjectDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};
const USER_COLUMNS: GridConfigDto = {
  columns: (['email', 'sectorKey'] as const satisfies readonly (keyof UserDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

function gridFindRow(columnNames: (string | undefined)[]): GridRowDto {
  return {
    cells: columnNames.map((columnName): GridCellDto =>
      columnName !== undefined
        ? { cellEnum: GridCellEnum.Find, columnName, placeHolder: 'Search' }
        : { cellEnum: GridCellEnum.Empty },
    ),
  };
}

function gridHeaderCell(column: string | undefined, sort?: GridStateSortDto): GridCellDto {
  const cell: GridCellDto = { cellEnum: GridCellEnum.Header, text: column, columnName: column };
  if (sort && sort.columnName === column) {
    cell.isSortAsc = sort.isSortAsc;
  }
  return cell;
}

function gridCommandSortClick(gridAreaDto: GridAreaDto): void {
  if (gridAreaDto.command?.commandEnum !== GridCommandEnum.SortClick) {
    return;
  }

  const columnName = gridAreaDto.command.columnName;
  if (columnName === undefined) {
    return;
  }

  const isSortAsc = !(gridAreaDto.state?.sort?.isSortAsc ?? false);
  gridAreaDto.state = { ...gridAreaDto.state, sort: { columnName, isSortAsc } };
}

async function gridLoadProject(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const projects = await projectsLoad(request);

  const headerRow: GridRowDto = {
    cells: [
      ...(PROJECT_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridAreaDto.state?.sort)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = projects.map((project, rowIndex) => ({
    cells: [
      ...(PROJECT_COLUMNS.columns ?? []).map(
        (column): GridCellDto => ({
          cellEnum: GridCellEnum.Text,
          text: project[column.columnName as keyof ProjectDto] as string | undefined,
          rowIndex,
          columnName: column.columnName,
        }),
      ),
      {
        cellEnum: GridCellEnum.Custom,
        customs: [{ text: 'Switch', name: 'Switch', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto],
        rowIndex,
      },
    ],
  }));

  const rowKeys = projects.map((project) => project.name ?? '');
  const findRow = gridFindRow([...(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName), undefined]);

  return { ...gridAreaDto, text: 'Project Data', rows: [headerRow, findRow, ...rows], rowKeys };
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
    cells: (USER_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridAreaDto.state?.sort)),
  };
  const rows: GridRowDto[] = users.map((user, rowIndex) => ({
    cells: (USER_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Text,
        text: user[column.columnName as keyof UserDto] as string | undefined,
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));
  const findRow = gridFindRow([...(USER_COLUMNS.columns ?? []).map((column) => column.columnName)]);

  return { ...gridAreaDto, text: 'User Data', rows: [headerRow, findRow, ...rows] };
}

async function gridLoadStorage(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const files = await storageFiles(request);

  const headerRow: GridRowDto = {
    cells: (STORAGE_FILE_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridAreaDto.state?.sort)),
  };
  const fileRows: GridRowDto[] = files.map((file, rowIndex) => ({
    cells: (STORAGE_FILE_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Text,
        text: String(file[column.columnName as keyof StorageFileDto]),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));
  const findRow = gridFindRow([...(STORAGE_FILE_COLUMNS.columns ?? []).map((column) => column.columnName)]);

  return { ...gridAreaDto, text: 'Storage Data', rows: [headerRow, findRow, ...fileRows] };
}

async function gridLoadHelloWorld(request: Request, gridAreaDto: GridAreaDto): Promise<GridAreaDto> {
  const findRow: GridRowDto = {
    cells: [
      { cellEnum: GridCellEnum.Find, placeHolder: 'Search' },
      { cellEnum: GridCellEnum.Find, placeHolder: 'Search' },
    ],
  };

  return {
    ...gridAreaDto,
    text: 'Hello World Data',
    rows: [
      findRow,
      { cells: [{ text: '1', rowIndex: 0 }, { text: 'Hello', rowIndex: 0 }] },
      { cells: [{ text: '2', rowIndex: 1 }, { text: 'World', rowIndex: 1 }] },
    ],
  };
}

export async function gridLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  for (const gridAreaDto of gridDto.areas ?? []) {
    gridCommandSortClick(gridAreaDto);
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
