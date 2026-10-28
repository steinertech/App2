import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { AlertEnum } from '../dto/shared/alert-dto.js';
import { alertAdd } from '../util/core/util-main.js';
import { projectsLoad, projectsLoadByIds, projectsUpdate, projectsInsert, projectsDelete } from '../util/db/util-project.js';
import { userProject, usersLoad } from '../util/db/util-user.js';
import { ProjectDto } from '../dto/db/project-dto.js';
import { UserDto } from '../dto/db/user-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridColumns, gridFindCommand, gridFindRow, gridFsp, gridHeaderCell, gridIsAnySelectedMulti, gridPatchDeleteMulti, gridRemoveCommand, gridSelectedMultiRowKeys, gridTables } from '../util/core/util-grid.js';
import { gridDataNew, gridDataSaveInsert, gridDataSaveUpdate } from '../util/core/util-grid-data.js';

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

/** Patches the "project" plane: enables/disables the DeleteMulti button of the project grid (GridPlaneDto.grids[0]). */
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
    await projectsUpdate(request, await gridDataSaveUpdate<ProjectDto>(request, 'ProjectDto', gridDto, PROJECT_COLUMNS.columns ?? [], false));
    await projectsInsert(request, gridDataSaveInsert<ProjectDto>(gridDto, PROJECT_COLUMNS.columns ?? []));
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Switch') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const rowKey = gridDto.state?.rowKeys?.[rowIndex];
      const projectName = rowKey !== undefined ? (await projectsLoadByIds(request, [rowKey]))[0]?.name : undefined;
      if (projectName !== undefined) {
        await userProject(request, projectName);
        alertAdd(request, AlertEnum.Success, `You switched to project ${projectName}!`);
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Delete') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const rowKey = gridDto.state?.rowKeys?.[rowIndex];
      if (rowKey !== undefined) {
        await projectsDelete(request, [rowKey]);
        // Selection is by rowIndex, which no longer matches the remaining rows.
        gridDto.state = { ...gridDto.state, isSelectedMulti: [] };
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'DeleteMulti') {
    const rowKeys = gridSelectedMultiRowKeys(gridDto);
    if (rowKeys.length > 0) {
      await projectsDelete(request, rowKeys);
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

  // rowKey is the _id (ObjectId hex), since name is editable.
  const rowKeys: string[] = projects.map((project) => project._id?.toHexString() ?? '');
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

  const result: GridDto = {
    ...gridDto,
    title: 'Project Data',
    setting: { isSelectMultiPatch: true },
    tables: gridTables([deleteMultiRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    // Two new rows.
    gridDataNew(result, gridColumns(PROJECT_COLUMNS.columns ?? []));
    gridDataNew(result, gridColumns(PROJECT_COLUMNS.columns ?? []));
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
