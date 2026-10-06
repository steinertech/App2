import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { AlertEnum } from '../dto/shared/alert-dto.js';
import { alertAdd } from '../util/util-main.js';
import { projectsLoad, projectsLoadByNames, projectsUpdate, projectsInsert, projectsDeleteByNames } from '../util/util-project.js';
import { userProject } from '../util/util-user.js';
import { ProjectDto } from '../dto/project-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridColumns, gridFindCommand, gridFindRow, gridFsp, gridHeaderCell, gridIsAnySelectedMulti, gridRemoveCommand } from '../util/util-grid.js';

const PROJECT_COLUMNS: GridConfigDto = {
  columns: (['name', 'description'] as const satisfies readonly (keyof ProjectDto)[]).map(
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
  return { rows: [textRow, buttonRow] };
}

export async function gridProjectLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
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
    setting: { title: `Project Data (${time})`, isSelectMultiPatch: true },
    rows: [deleteMultiRow, headerRow, findRow, ...rows],
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    await gridProjectNew(request, result);
  }

  // Bar last, after any New rows.
  result.rows = [...(result.rows ?? []), gridBarRow()];

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Confirm') {
    result.planes = [null, { grids: [gridConfirm('Are you sure?')] }];
  }

  if (gridRemoveCommand(gridDto, 'Cancel')) {
    result.setting = { ...result.setting, title: 'Hello World (Cancel)' };
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

  const columnNames = new Set(gridColumns(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName));

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

  const columnNames = new Set(gridColumns(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName));

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

  gridDto.rows = [...rows, ...newRows];
}
