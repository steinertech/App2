import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { debugLoad, debugLoadByIds, debugUpdate, debugInsert } from '../util/util-debug.js';
import { DebugDto } from '../dto/debug-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFindRow, gridFsp, gridHeaderCell, gridTables } from '../util/util-grid.js';

const DEBUG_COLUMNS: GridConfigDto = {
  columns: (['name', 'text'] as const satisfies readonly (keyof DebugDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "debug" plane: the debug grid (GridPlaneDto.grids[0]). */
export async function planeDebugLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDebugSaveUpdate(request, gridDto);
    await gridDebugSaveInsert(request, gridDto);
  }

  // Filter-Sort-Page: debugs holds only the rows of the current page.
  const { rows: debugs, state: fspState } = gridFsp(await debugLoad(request), DEBUG_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(DEBUG_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = debugs.map((debug, rowIndex) => ({
    cells: gridColumns(DEBUG_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText(debug[column.columnName as keyof DebugDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex), since name is editable and not unique.
  const rowKeys: string[] = debugs.map((debug) => debug._id?.toHexString() ?? '');
  const findRow = gridFindRow(gridColumns(DEBUG_COLUMNS.columns ?? []).map((column) => column.columnName));

  const time = new Date().toISOString().slice(11, 19);

  const result: GridDto = {
    ...gridDto,
    title: `Debug Data (${time})`,
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDebugNew(result);
  }

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return { ...gridPlaneDto, grids: [result] };
}

/** Patches the "debug" plane: the debug grid (GridPlaneDto.grids[0]) has no patches. */
export async function planeDebugPatch(_request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [{}] };
}

async function gridDebugSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const debugs = await debugLoadByIds(request, ids);

  const columns = gridColumns(DEBUG_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const debug = debugs.find((debug) => debug._id?.toHexString() === rowKey);
    if (debug) {
      (debug as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await debugUpdate(request, debugs);
}

async function gridDebugSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(DEBUG_COLUMNS.columns ?? []);

  const debugsByRowIndex = new Map<number, DebugDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const debug = debugsByRowIndex.get(modify.rowIndex) ?? {};
    (debug as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    debugsByRowIndex.set(modify.rowIndex, debug);
  }

  await debugInsert(request, [...debugsByRowIndex.values()]);
}

/** Appends one empty, editable new row to the data table (GridDto.tables[1]). */
function gridDebugNew(gridDto: GridDto): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: gridColumns(DEBUG_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        columnName: column.columnName,
        placeHolder: 'New',
        rowIndex,
        isNew: true,
      }),
    ),
  };

  dataTable.rows = [...rows, newRow];
}
