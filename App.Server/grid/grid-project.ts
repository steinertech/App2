import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { AlertEnum } from '../dto/shared/alert-dto.js';
import { alertAdd } from '../util/util-main.js';
import { projectsLoad, projectsLoadByNames, projectsUpdate, projectsInsert, projectsDeleteByNames } from '../util/util-project.js';
import { userProject, usersLoad } from '../util/util-user.js';
import { ProjectDto } from '../dto/project-dto.js';
import { UserDto } from '../dto/user-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFindCommand, gridFindRow, gridFsp, gridHeaderCell, gridIsAnySelectedMulti, gridPatchDeleteMulti, gridRemoveCommand, gridTables } from '../util/util-grid.js';

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
  return { tables: gridTables([], [textRow, buttonRow]) };
}

/** Loads the "project" plane: the project grid (GridPlaneDto.grids[0]) and the user grid (grids[1]). */
export async function planeProjectLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const grids = await Promise.all([gridProjectLoadGrid(request, gridPlaneDto.grids?.[0] ?? {}), gridUserLoadGrid(request, gridPlaneDto.grids?.[1] ?? {})]);
  return { ...gridPlaneDto, grids };
}

/** Loads the "debug" plane: the project grid (GridPlaneDto.grids[0]) only. */
export async function planeDebugLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [await gridProjectLoadGrid(request, gridPlaneDto.grids?.[0] ?? {})] };
}

/** Patches the "project" and "debug" planes: enables/disables the DeleteMulti button of the project grid (GridPlaneDto.grids[0]). */
export async function planeProjectPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridPlaneDto.grids?.[0] ?? {})] };
}

async function gridUserLoadGrid(request: Request, gridDto: GridDto): Promise<GridDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    cells: gridColumns(USER_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = users.map((user, rowIndex) => ({
    cells: gridColumns(USER_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText(user[column.columnName as keyof UserDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));
  const findRow = gridFindRow([...gridColumns(USER_COLUMNS.columns ?? []).map((column) => column.columnName)]);

  return { ...gridDto, title: 'User Data', tables: gridTables([], [headerRow, findRow, ...rows]) };
}

async function gridProjectLoadGrid(request: Request, gridDto: GridDto): Promise<GridDto> {
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
        alertAdd(request, AlertEnum.Success, `You switched to project ${projectName}!`);
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Delete') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const projectName = gridDto.state?.rowKeys?.[rowIndex];
      if (projectName !== undefined) {
        await projectsDeleteByNames(request, [projectName]);
        // Selection is by rowIndex, which no longer matches the remaining rows.
        gridDto.state = { ...gridDto.state, isSelectedMulti: [] };
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
    // Selection is by rowIndex, which no longer matches the remaining rows.
    gridDto.state = { ...gridDto.state, isSelectedMulti: [] };
  }

  // Filter-Sort-Page: projects holds only the rows of the current page.
  const { rows: projects, state: fspState } = gridFsp(await projectsLoad(request), PROJECT_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: [
      ...gridColumns(PROJECT_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = projects.map((project, rowIndex) => ({
    cells: [
      ...gridColumns(PROJECT_COLUMNS.columns ?? []).map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: gridCellText(project[column.columnName as keyof ProjectDto], column),
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
  const findRow = gridFindRow([...gridColumns(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName), undefined]);

  const deleteMultiRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          {
            text: 'Delete',
            name: 'DeleteMulti',
            customEnum: GridCustomEnum.Button,
            isDisabled: !gridIsAnySelectedMulti(gridDto),
          } satisfies GridCustomDto,
        ],
      },
    ],
  };

  const time = new Date().toISOString().slice(11, 19);

  const result: GridDto = {
    ...gridDto,
    title: `Project Data (${time})`,
    setting: { isSelectMultiPatch: true },
    tables: gridTables([deleteMultiRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    await gridProjectNew(request, result);
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Confirm') {
    result.planes = [null, { grids: [gridConfirm('Are you sure?')] }];
  }

  if (gridRemoveCommand(gridDto, 'Cancel')) {
    result.title = 'Hello World (Cancel)';
  }

  const confirmTwoGridDto = gridFindCommand(gridDto, 'ConfirmTwo');
  if (confirmTwoGridDto !== undefined) {
    confirmTwoGridDto.planes = [null, { grids: [gridConfirm('Are you sure?')] }];
    confirmTwoGridDto.command = undefined;
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

  const columns = gridColumns(PROJECT_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const project = projects.find((project) => project.name === rowKey);
    if (project) {
      (project as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await projectsUpdate(request, projects);
}

async function gridProjectSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(PROJECT_COLUMNS.columns ?? []);

  const projectsByRowIndex = new Map<number, ProjectDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const project = projectsByRowIndex.get(modify.rowIndex) ?? {};
    (project as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    projectsByRowIndex.set(modify.rowIndex, project);
  }

  await projectsInsert(request, [...projectsByRowIndex.values()]);
}

/** Appends two empty, editable new rows to the data table (GridDto.tables[1]). */
async function gridProjectNew(request: Request, gridDto: GridDto): Promise<void> {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];

  const newRows: GridRowDto[] = [0, 1].map((rowOffset) => {
    const rowIndex = rows.length + rowOffset;
    return {
      cells: gridColumns(PROJECT_COLUMNS.columns ?? []).map(
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

  dataTable.rows = [...rows, ...newRows];
}
