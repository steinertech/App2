import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { dynamicColumnNameLoad, dynamicInsert, dynamicLoad, dynamicLoadByIds, dynamicTableLoad, dynamicUpdate } from '../util/util-dynamic.js';
import { DynamicDto, DynamicTableNameDto } from '../dto/dynamic-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridTables } from '../util/util-grid.js';

const DYNAMIC_COLUMNS: GridConfigDto = {
  columns: (['tableName'] as const satisfies readonly (keyof DynamicTableNameDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** DynamicDto fields: a SchemaDto.columnName with one of these names is not a Data grid column, so saving it can't overwrite them. */
const DYNAMIC_FIELD_NAMES = new Set<string>(['_id', 'name', 'sectorKey', 'type', 'tableName'] satisfies (keyof DynamicDto)[]);

/**
 * Columns of the Data grid: DynamicDto.tableName, then the column values stored as additional fields of the DynamicDto document (not declared on DynamicDto):
 * the SchemaDto.columnName list of tableName, or the standard columns A, B if no tableName is selected.
 * Column names that aren't plain MongoDB field names (starting with "$" or containing ".") or that are DynamicDto fields are skipped.
 */
async function gridDynamicDataColumns(request: Request, tableName: string | undefined): Promise<GridConfigColumnDto[]> {
  const columnNames =
    tableName !== undefined
      ? (await dynamicColumnNameLoad(request, tableName)).filter((columnName) => !DYNAMIC_FIELD_NAMES.has(columnName) && !columnName.startsWith('$') && !columnName.includes('.'))
      : ['A', 'B'];
  return ['tableName' satisfies keyof DynamicDto, ...new Set(columnNames)].map((columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }));
}

/**
 * Loads the "dynamic" plane: the read-only dynamic grid (GridPlaneDto.grids[0]) with the distinct SchemaDto.tableName values,
 * and the editable Data grid (grids[1]) with the DynamicDto rows of the tableName selected in grids[0] (all rows if none is selected).
 */
export async function planeDynamicLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  // The Data grid depends on the reloaded dynamic grid (its selected row), so it is built afterwards.
  const gridDto = await gridDynamicLoad(request, gridPlaneDto.grids?.[0] ?? {});
  const dataGridDto = await gridDynamicDataLoad(request, gridPlaneDto.grids?.[1] ?? {}, gridDynamicSelectedTableName(gridDto));
  return { ...gridPlaneDto, grids: [gridDto, dataGridDto] };
}

/** Returns the tableName of the selected row of the dynamic grid (its rowKey), or undefined if no row is selected. */
function gridDynamicSelectedTableName(gridDto: GridDto): string | undefined {
  const selected = gridDto.state?.selected;
  return selected !== undefined ? gridDto.state?.rowKeys?.[selected] : undefined;
}

async function gridDynamicLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  const allDynamics = await dynamicTableLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DYNAMIC_COLUMNS.columns ?? [], allDynamics);

  // Filter-Sort-Page: dynamics holds only the rows of the current page.
  const { rows: dynamics, state: fspState } = gridFsp(allDynamics, DYNAMIC_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(DYNAMIC_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  // Load only: cells are read-only (GridCellEnum.Label).
  const rows: GridRowDto[] = dynamics.map((dynamic, rowIndex) => ({
    cells: gridColumns(DYNAMIC_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Label,
        text: gridCellText(dynamic[column.columnName as keyof DynamicTableNameDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the tableName, which is distinct.
  const rowKeys: string[] = dynamics.map((dynamic) => dynamic.tableName);
  const findRow = gridFindRow(gridColumns(DYNAMIC_COLUMNS.columns ?? []).map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: 'Table',
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
    setting: { isSelectPatch: true },
  };

  // Lookup (planes[0]): Filter Multi (opened by planeDynamicPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, DYNAMIC_COLUMNS.columns ?? [], allDynamics));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/** tableName (the selected row of the dynamic grid) filters the rows and is the default tableName of inserted rows; undefined shows all rows. */
async function gridDynamicDataLoad(request: Request, gridDto: GridDto, tableName: string | undefined): Promise<GridDto> {
  const dataColumns = await gridDynamicDataColumns(request, tableName);
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDynamicDataSaveUpdate(request, gridDto, dataColumns);
    await gridDynamicDataSaveInsert(request, gridDto, tableName, dataColumns);
  }

  const allDynamics = await dynamicLoad(request, tableName);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, dataColumns, allDynamics);

  // Filter-Sort-Page: dynamics holds only the rows of the current page.
  const { rows: dynamics, state: fspState } = gridFsp(allDynamics, dataColumns, gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(dataColumns).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = dynamics.map((dynamic, rowIndex) => ({
    cells: gridColumns(dataColumns).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText((dynamic as Record<string, unknown>)[column.columnName ?? ''], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex).
  const rowKeys: string[] = dynamics.map((dynamic) => dynamic._id?.toHexString() ?? '');
  const findRow = gridFindRow(gridColumns(dataColumns).map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: 'Data',
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDynamicDataNew(result, dataColumns);
  }

  // Lookup (planes[0]): Filter Multi (opened by planeDynamicPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, dataColumns, allDynamics));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/**
 * Patches the "dynamic" plane's grids (dynamic grid GridPlaneDto.grids[0], Data grid grids[1]):
 * GridCommandEnum.FilterMulti opens the Filter Multi lookup (distinct texts of its column);
 * GridCommandEnum.Select of a dynamic grid row replaces the Data grid with the rows of the selected tableName.
 */
export async function planeDynamicPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  const dataGridDto = gridPlaneDto.grids?.[1] ?? {};
  // The incoming state carries selected and the rowKeys of the loaded rows.
  const tableName = gridDynamicSelectedTableName(gridDto);
  if (gridDto.command?.commandEnum === GridCommandEnum.Select) {
    // Other rows and columns are shown: start on the first page with no selection, sort or filter, and drop the pending command, unsaved modifies and an open lookup.
    const dataGridDtoSelect: GridDto = {
      ...dataGridDto,
      command: undefined,
      modifies: undefined,
      planes: undefined,
      state: { ...dataGridDto.state, selected: undefined, isSelectedMulti: undefined, pageIndex: 0, sort: undefined, filters: undefined, filterMultis: undefined },
    };
    const grid = await gridDynamicDataLoad(request, dataGridDtoSelect, tableName);
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] }] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DYNAMIC_COLUMNS.columns ?? [], await dynamicTableLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}] };
  }
  if (dataGridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(dataGridDto, await gridDynamicDataColumns(request, tableName), await dynamicLoad(request, tableName));
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [{}, {}] };
}

async function gridDynamicDataSaveUpdate(request: Request, gridDto: GridDto, dataColumns: GridConfigColumnDto[]): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const dynamics = await dynamicLoadByIds(request, ids);

  const columns = gridColumns(dataColumns);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const dynamic = dynamics.find((dynamic) => dynamic._id?.toHexString() === rowKey);
    if (dynamic) {
      (dynamic as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await dynamicUpdate(request, dynamics);
}

/** New rows get tableName (the selected tableName) unless their tableName cell is entered. */
async function gridDynamicDataSaveInsert(request: Request, gridDto: GridDto, tableName: string | undefined, dataColumns: GridConfigColumnDto[]): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(dataColumns);

  const dynamicsByRowIndex = new Map<number, DynamicDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    // No tableName field if undefined (the driver would store null).
    const dynamic = dynamicsByRowIndex.get(modify.rowIndex) ?? (tableName !== undefined ? { tableName } : {});
    (dynamic as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    dynamicsByRowIndex.set(modify.rowIndex, dynamic);
  }

  await dynamicInsert(request, [...dynamicsByRowIndex.values()]);
}

/** Appends one empty, editable new row to the data table (GridDto.tables[1]). */
function gridDynamicDataNew(gridDto: GridDto, dataColumns: GridConfigColumnDto[]): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: gridColumns(dataColumns).map(
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
