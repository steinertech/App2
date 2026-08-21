import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPageDto, GridRowDto, GridSortDto } from '../dto/web/grid-dto.js';
import { titleCase } from './util-main.js';
import { projectsLoad, projectsLoadByNames, projectsUpdate, projectsInsert, projectsDeleteByNames } from './util-project.js';
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
        ? { cellEnum: GridCellEnum.Search, columnName, placeHolder: 'Search' }
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

function gridConfirm(text: string): GridDto {
  const textRow: GridRowDto = {
    cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ customEnum: GridCustomEnum.Label, text }] }],
  };
  const buttonRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { customEnum: GridCustomEnum.Button, text: 'Ok', name: 'Ok' },
          { customEnum: GridCustomEnum.Button, text: 'Cancel', name: 'Cancel' },
          { customEnum: GridCustomEnum.Button, text: 'ConfirmTwo', name: 'ConfirmTwo' },
        ],
      },
    ],
  };
  return { rows: [textRow, buttonRow] };
}

/**
 * Recursively walks gridDto.pages for the GridPageDto whose grids contain a GridDto with the given customName
 * command, and removes that GridPageDto from its immediate parent's pages list. Returns true if found and removed.
 */
function gridRemoveCommand(gridDto: GridDto, customName: string): boolean {
  const pages = gridDto.pages;
  if (pages === undefined) {
    return false;
  }

  for (let pagesIndex = 0; pagesIndex < pages.length; pagesIndex += 1) {
    const grids = pages[pagesIndex].grids ?? [];
    const isMatch = grids.some(
      (nestedGridDto) =>
        nestedGridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && nestedGridDto.command.customName === customName,
    );
    if (isMatch) {
      pages.splice(pagesIndex, 1);
      return true;
    }

    for (const nestedGridDto of grids) {
      if (gridRemoveCommand(nestedGridDto, customName)) {
        return true;
      }
    }
  }

  return false;
}

/** Recursively walks gridDto and every GridDto nested under gridDto.pages (GridPageDto[] -> GridDto[] -> pages -> ...) for the first one whose own command matches customName. */
function gridFindCommand(gridDto: GridDto, customName: string): GridDto | undefined {
  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === customName) {
    return gridDto;
  }

  for (const gridPage of gridDto.pages ?? []) {
    for (const nestedGridDto of gridPage.grids ?? []) {
      const found = gridFindCommand(nestedGridDto, customName);
      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
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
    await gridProjectSaveUpdate(request, gridDto);
    await gridProjectSaveInsert(request, gridDto);
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Switch') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const projectName = gridDto.state?.rowKeys?.[rowIndex];
      if (projectName !== undefined) {
        await userProject(request, projectName);
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Delete') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const projectName = gridDto.state?.rowKeys?.[rowIndex];
      if (projectName !== undefined) {
        await projectsDeleteByNames(request, [projectName]);
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'DeleteMulti') {
    const rowKeys = gridDto.state?.rowKeys ?? [];
    const projectNames = (gridDto.state?.isSelectedMulti ?? [])
      .map((isSelected, rowIndex) => (isSelected ? rowKeys[rowIndex] : undefined))
      .filter((projectName): projectName is string => projectName !== undefined);
    if (projectNames.length > 0) {
      await projectsDeleteByNames(request, projectNames);
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
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: project[column.columnName as keyof ProjectDto] as string | undefined,
          rowIndex,
          columnName: column.columnName,
          isSelectMulti: columnIndex === 0 ? true : undefined,
        }),
      ),
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { text: 'Switch', name: 'Switch', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
          { text: 'Delete', name: 'Delete', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
          { text: 'Confirm', name: 'Confirm', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
        ],
        rowIndex,
      },
    ],
  }));

  const rowKeys: string[] = projects.map((project) => project.name ?? '');
  const findRow = gridFindRow([...(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName), undefined]);

  const deleteMultiRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [{ text: 'Delete', name: 'DeleteMulti', customEnum: GridCustomEnum.Button } satisfies GridCustomDto],
      },
    ],
  };

  const time = new Date().toISOString().slice(11, 19);

  const result: GridDto = {
    ...gridDto,
    text: `Project Data (${time})`,
    rows: [deleteMultiRow, headerRow, findRow, ...rows],
    state: { ...gridDto.state, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    await gridProjectNew(request, result);
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Confirm') {
    result.pages = [{ grids: [gridConfirm('Are you sure?')] }];
  }

  if (gridRemoveCommand(gridDto, 'Cancel')) {
    result.text = 'Hello World (Cancel)';
  }

  const confirmTwoGridDto = gridFindCommand(gridDto, 'ConfirmTwo');
  if (confirmTwoGridDto !== undefined) {
    confirmTwoGridDto.pages = [{ grids: [gridConfirm('Are you sure?')] }];
  }

  // Command is transient: clear it so it isn't re-processed on a later request that only carries a nested dialog override.
  result.command = undefined;

  return result;
}

async function gridProjectSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
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
      modify.cellEnum !== GridCellEnum.Edit ||
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

  await projectsUpdate(request, projects);
}

async function gridProjectSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columnNames = new Set((PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName));

  const projectsByRowIndex = new Map<number, ProjectDto>();

  for (const modify of modifies) {
    if (
      modify.rowIndex === undefined ||
      modify.columnName === undefined ||
      modify.cellEnum !== GridCellEnum.Edit ||
      !columnNames.has(modify.columnName)
    ) {
      continue;
    }

    const project = projectsByRowIndex.get(modify.rowIndex) ?? {};
    (project as Record<string, string | undefined>)[modify.columnName] = modify.textModified;
    projectsByRowIndex.set(modify.rowIndex, project);
  }

  await projectsInsert(request, [...projectsByRowIndex.values()]);
}

async function gridProjectNew(request: Request, gridDto: GridDto): Promise<void> {
  const rows = gridDto.rows ?? [];

  const newRows: GridRowDto[] = [0, 1].map((rowOffset) => {
    const rowIndex = rows.length + rowOffset;
    return {
      cells: (PROJECT_COLUMNS.columns ?? []).map(
        (column): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          columnName: column.columnName,
          placeHolder: 'New',
          rowIndex,
          isNew: true,
        }),
      ),
    };
  });

  gridDto.rows = [...rows, ...newRows];
}

async function gridLoadUser(request: Request, gridDto: GridDto): Promise<GridDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    cells: (USER_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = users.map((user, rowIndex) => ({
    cells: (USER_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
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
        cellEnum: GridCellEnum.Edit,
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

export async function gridPageLoad(request: Request, gridPageDto: GridPageDto): Promise<GridPageDto> {
  const loaders = gridPageDto.pageName !== undefined ? (PAGE_GRID_LOADERS[gridPageDto.pageName] ?? []) : [];
  const incomingGrids = gridPageDto.grids ?? [];

  const grids = await Promise.all(
    loaders.map((loader, gridIndex): Promise<GridDto> => {
      const gridDto: GridDto = incomingGrids[gridIndex] ?? {};
      gridCommandSortClick(gridDto);
      return loader(request, gridDto);
    }),
  );

  return { grids };
}
