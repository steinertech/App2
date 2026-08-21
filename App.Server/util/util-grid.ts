import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPageDto, GridRowDto, GridSortDto } from '../dto/web/grid-dto.js';
import { titleCase } from './util-main.js';
import { projectsLoad, projectsLoadByNames, projectsUpsert } from './util-project.js';
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
  columns: (['name', 'description'] as const satisfies readonly (keyof ProjectDto)[]).map(
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

function gridHeaderCell(column: string | undefined, sort?: GridSortDto): GridCellDto {
  const cell: GridCellDto = { cellEnum: GridCellEnum.Header, text: titleCase(column), columnName: column };
  if (sort && sort.columnName === column) {
    cell.isSortAsc = sort.isSortAsc;
  }
  return cell;
}

function gridCommandSortClick(gridDto: GridDto): void {
  if (gridDto.command?.commandEnum !== GridCommandEnum.SortClick) {
    return;
  }

  const columnName = gridDto.command.columnName;
  if (columnName === undefined) {
    return;
  }

  const isSortAsc = !(gridDto.state?.sort?.isSortAsc ?? false);
  gridDto.state = { ...gridDto.state, sort: { columnName, isSortAsc } };
}

async function gridProjectLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridProjectSave(request, gridDto);
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick) {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const projectName = gridDto.state?.rowKeys?.[rowIndex];
      if (projectName !== undefined) {
        await userProject(request, projectName);
      }
    }
  }

  const projects = await projectsLoad(request);

  const headerRow: GridRowDto = {
    cells: [
      ...(PROJECT_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
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

  const rowKeys: string[] = projects.map((project) => project.name ?? '');
  const findRow = gridFindRow([...(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName), undefined]);

  const time = new Date().toISOString().slice(11, 19);

  const result: GridDto = {
    ...gridDto,
    text: `Project Data (${time})`,
    rows: [headerRow, findRow, ...rows],
    state: { ...gridDto.state, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    await gridProjectNew(request, result);
  }

  return result;
}

async function gridProjectSave(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = gridDto.modifies ?? [];
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const names = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const projects = await projectsLoadByNames(request, names);

  const columnNames = new Set((PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName));

  for (const modify of modifies) {
    if (
      modify.rowIndex === undefined ||
      modify.columnName === undefined ||
      modify.cellEnum !== GridCellEnum.Text ||
      !columnNames.has(modify.columnName)
    ) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const project = projects.find((project) => project.name === rowKey);
    if (project) {
      (project as Record<string, string | undefined>)[modify.columnName] = modify.textModified;
    }
  }

  await projectsUpsert(request, projects);
}

async function gridProjectNew(request: Request, gridDto: GridDto): Promise<void> {
  const rowIndex = gridDto.rows?.length ?? 0;
  const cells: GridCellDto[] = (PROJECT_COLUMNS.columns ?? []).map(
    (column): GridCellDto => ({
      cellEnum: GridCellEnum.Text,
      columnName: column.columnName,
      placeHolder: 'New',
      rowIndex,
      isNew: true,
    }),
  );
  gridDto.rows = [...(gridDto.rows ?? []), { cells }];
}

async function gridLoadUser(request: Request, gridDto: GridDto): Promise<GridDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    cells: (USER_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
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

  return { ...gridDto, text: 'User Data', rows: [headerRow, findRow, ...rows] };
}

async function gridLoadStorage(request: Request, gridDto: GridDto): Promise<GridDto> {
  const files = await storageFiles(request);

  const headerRow: GridRowDto = {
    cells: (STORAGE_FILE_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
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

  return { ...gridDto, text: 'Storage Data', rows: [headerRow, findRow, ...fileRows] };
}

type GridLoader = (request: Request, gridDto: GridDto) => Promise<GridDto>;

const PAGE_GRID_LOADERS: Record<string, GridLoader[]> = {
  debug: [gridProjectLoad],
  project: [gridProjectLoad, gridLoadUser],
  storage: [gridLoadStorage],
};

export async function gridLoad(request: Request, gridPageDto: GridPageDto): Promise<GridPageDto> {
  const loaders = gridPageDto.pageName !== undefined ? (PAGE_GRID_LOADERS[gridPageDto.pageName] ?? []) : [];
  const incomingPage = gridPageDto.page ?? [];

  const page = await Promise.all(
    loaders.map((loader, gridIndex): Promise<GridDto> => {
      const gridDto: GridDto = incomingPage[gridIndex] ?? {};
      gridCommandSortClick(gridDto);
      return loader(request, gridDto);
    }),
  );

  return { page };
}
