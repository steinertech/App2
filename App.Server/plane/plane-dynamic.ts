import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { dynamicColumnNameLoad, dynamicInsert, dynamicLoad, dynamicLoadByIds, dynamicTableLoad, dynamicUpdate } from '../util/util-dynamic.js';
import { DynamicDto, DynamicTableNameDto } from '../dto/db/dynamic-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumnChooserLoad, gridColumnChooserOk, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridRowValue, gridTables } from '../util/util-grid.js';

const DYNAMIC_COLUMNS: GridConfigDto = {
  columns: (['tableName'] as const satisfies readonly (keyof DynamicTableNameDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Static columns of the Data grid: DynamicDto fields. A SchemaDto.columnName with one of these names is skipped, since a grid's column names are unique. */
const DYNAMIC_STATIC_COLUMN_NAMES: readonly string[] = ['tableName'] satisfies (keyof DynamicDto)[];

/**
 * Columns of the Data grid: the static columns (DYNAMIC_STATIC_COLUMN_NAMES, DynamicDto fields), then the dynamic ones (DynamicDto.values, see rowToValue):
 * the SchemaDto.columnName list of tableName, or the standard columns A, B if no tableName is selected.
 * Column names that aren't plain MongoDB field names (starting with "$" or containing ".") or that are static column names are skipped.
 * Also used by the Design Band grid's Columns lookup (DesignBandDto.columns of a Table band). hiddenColumnNames (e.g. of a content view Table band) get isHide.
 */
export async function gridDynamicDataColumns(request: Request, tableName: string | undefined, hiddenColumnNames?: string[]): Promise<GridConfigColumnDto[]> {
  const columnNames =
    tableName !== undefined
      ? (await dynamicColumnNameLoad(request, tableName)).filter((columnName) => !DYNAMIC_STATIC_COLUMN_NAMES.includes(columnName) && !columnName.startsWith('$') && !columnName.includes('.'))
      : ['A', 'B'];
  const isHide = (columnName: string): boolean | undefined => hiddenColumnNames?.includes(columnName) || undefined;
  return [
    ...DYNAMIC_STATIC_COLUMN_NAMES.map((columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text, isHide: isHide(columnName) })),
    ...[...new Set(columnNames)].map(
      (columnName): GridConfigColumnDto => ({
        columnName, typeEnum: GridConfigTypeEnum.Text, isHide: isHide(columnName), rowToValue: (row) => (row as DynamicDto).values?.[columnName],
      }),
    ),
  ];
}

/** Sets value of columnName on dynamic: a static column (DYNAMIC_STATIC_COLUMN_NAMES) as its DynamicDto field, any other in DynamicDto.values. */
function gridDynamicDataValueSet(dynamic: DynamicDto, columnName: string, value: unknown): void {
  if (DYNAMIC_STATIC_COLUMN_NAMES.includes(columnName)) {
    (dynamic as Record<string, unknown>)[columnName] = value;
  } else {
    dynamic.values = { ...dynamic.values, [columnName]: value };
  }
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
  const selected = gridDto.state?.selectedRowIndex;
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

/**
 * Builds the Data grid. tableName (the selected row of the dynamic grid, or the TableName of a content view Table band) filters the rows and is the default tableName
 * of inserted rows; undefined shows all rows. rowFilter (e.g. the detail filter of a content view grid) further filters the rows, if set. newValues (e.g. the master
 * values of a content view detail grid) are set on every inserted row and shown as labels in the New row. isColumnChooser (e.g. a content view Table band) adds the
 * toolbar's Column Chooser button (opened by gridDynamicDataColumnChooserLoad), showing only the chosen columns (GridStateDto.columnNames). hiddenColumnNames (e.g. of a
 * content view Table band, see DesignBandColumnDto.isVisible) are never shown, nor offered by the Column Chooser; newValues are still set on them. isDistinct (e.g. the
 * IsDistinct property of a content view Table band) shows one read-only row per distinct combination of the shown columns' texts (see gridDynamicDataDistinct).
 */
export async function gridDynamicDataLoad(
  request: Request, gridDto: GridDto, tableName: string | undefined, rowFilter?: (dynamic: DynamicDto) => boolean, newValues?: Record<string, string>,
  isColumnChooser?: boolean, hiddenColumnNames?: string[], isDistinct?: boolean,
): Promise<GridDto> {
  const dataColumns = await gridDynamicDataColumns(request, tableName, hiddenColumnNames);
  // Column Chooser Ok: apply the chosen columns (GridStateDto.columnNames) before the rows are built.
  gridColumnChooserOk(gridDto, dataColumns);
  const columns = gridColumns(dataColumns, gridDto.state);
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDynamicDataSaveUpdate(request, gridDto, dataColumns);
    await gridDynamicDataSaveInsert(request, gridDto, tableName, dataColumns, newValues);
  }

  const rowFilterDynamics = (await dynamicLoad(request, tableName)).filter((dynamic) => rowFilter?.(dynamic) ?? true);
  const allDynamics = isDistinct ? gridDynamicDataDistinct(rowFilterDynamics, columns) : rowFilterDynamics;

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, dataColumns, allDynamics);

  // Filter-Sort-Page: dynamics holds only the rows of the current page.
  const { rows: dynamics, state: fspState } = gridFsp(allDynamics, dataColumns, gridDto.state);

  const headerRow: GridRowDto = {
    cells: columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = dynamics.map((dynamic, rowIndex) => ({
    cells: columns.map(
      (column): GridCellDto => ({
        // A distinct row stands for all rows of its key group, so it isn't edited.
        cellEnum: isDistinct ? GridCellEnum.Label : GridCellEnum.Edit,
        text: gridCellText(gridRowValue(dynamic, column), column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex); of a distinct row, the _id of any row of its key group (see gridDynamicDataDistinct).
  const rowKeys: string[] = dynamics.map((dynamic) => dynamic._id?.toHexString() ?? '');
  const findRow = gridFindRow(columns.map((column) => column.columnName));

  const toolbarRows: GridRowDto[] = isColumnChooser
    ? [{ cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ text: 'Column Chooser', name: 'ColumnChooser', customEnum: GridCustomEnum.ColumnChooser }] }] }]
    : [];

  const result: GridDto = {
    ...gridDto,
    title: 'Data',
    tables: gridTables(toolbarRows, [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDynamicDataNew(result, columns, newValues);
  }

  // Lookup (planes[0]): Column Chooser (opened by gridDynamicDataColumnChooserLoad, kept open while planes[0].planeName is columnChooser)
  // or Filter Multi (opened by planeDynamicPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridColumnChooserLoad(gridDto, dataColumns) ?? gridFilterMultiLoad(gridDto, dataColumns, allDynamics));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/**
 * Returns one row per key group of dynamics, the key being the texts of columns (the shown columns): the first row of each group, in the order of dynamics.
 * So the row's _id (rowKey) is the _id of any row of its key group, e.g. the master value a detail grid reads by it (fieldNameMaster) is the same for every row of
 * the group if fieldNameMaster is a shown column.
 */
function gridDynamicDataDistinct(dynamics: DynamicDto[], columns: GridConfigColumnDto[]): DynamicDto[] {
  const result = new Map<string, DynamicDto>();
  for (const dynamic of dynamics) {
    const key = JSON.stringify(columns.map((column) => gridCellText(gridRowValue(dynamic, column), column)));
    if (!result.has(key)) {
      result.set(key, dynamic);
    }
  }
  return [...result.values()];
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
      state: { ...dataGridDto.state, selectedRowIndex: undefined, selectedColumnName: undefined, isSelectedMulti: undefined, pageIndex: 0, sort: undefined, filters: undefined, filterMultis: undefined },
    };
    const grid = await gridDynamicDataLoad(request, dataGridDtoSelect, tableName);
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] }] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DYNAMIC_COLUMNS.columns ?? [], await dynamicTableLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}] };
  }
  if (dataGridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = await gridDynamicDataFilterMultiLoad(request, dataGridDto, tableName);
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [{}, {}] };
}

/**
 * Returns the Filter Multi lookup plane (see gridFilterMultiLoad) of the Data grid gridDto with the DynamicDto rows of tableName (all rows if undefined), only those of
 * rowFilter if set (see gridDynamicDataLoad), without hiddenColumnNames.
 */
export async function gridDynamicDataFilterMultiLoad(
  request: Request, gridDto: GridDto, tableName: string | undefined, rowFilter?: (dynamic: DynamicDto) => boolean, hiddenColumnNames?: string[],
): Promise<GridPlaneDto | undefined> {
  const dynamics = (await dynamicLoad(request, tableName)).filter((dynamic) => rowFilter?.(dynamic) ?? true);
  return gridFilterMultiLoad(gridDto, await gridDynamicDataColumns(request, tableName, hiddenColumnNames), dynamics);
}

/**
 * Returns the Column Chooser lookup plane (see gridColumnChooserLoad) of the Data grid gridDto with the columns of tableName without hiddenColumnNames
 * (see gridDynamicDataLoad's isColumnChooser).
 */
export async function gridDynamicDataColumnChooserLoad(
  request: Request, gridDto: GridDto, tableName: string | undefined, hiddenColumnNames?: string[],
): Promise<GridPlaneDto | undefined> {
  return gridColumnChooserLoad(gridDto, await gridDynamicDataColumns(request, tableName, hiddenColumnNames));
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
      gridDynamicDataValueSet(dynamic, modify.columnName, gridCellValue(modify.textModified, column));
    }
  }

  await dynamicUpdate(request, dynamics);
}

/** New rows get tableName (the selected tableName) unless their tableName cell is entered. */
async function gridDynamicDataSaveInsert(
  request: Request, gridDto: GridDto, tableName: string | undefined, dataColumns: GridConfigColumnDto[], newValues: Record<string, string> | undefined,
): Promise<void> {
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
    gridDynamicDataValueSet(dynamic, modify.columnName, gridCellValue(modify.textModified, column));
    dynamicsByRowIndex.set(modify.rowIndex, dynamic);
  }

  // newValues (DynamicDto.values, like the fields a content view detail filters by) win over a modify of the same column (its value from text like a modify if it is a column).
  const values = Object.fromEntries(Object.entries(newValues ?? {}).map(([columnName, text]) => {
    const column = columns.find((column) => column.columnName === columnName);
    return [columnName, column !== undefined ? gridCellValue(text, column) : text];
  }));
  await dynamicInsert(request, [...dynamicsByRowIndex.values()].map((dynamic): DynamicDto => ({ ...dynamic, values: { ...dynamic.values, ...values } })));
}

/** Appends one empty, editable new row (a cell per column of columns, the rendered ones) to the data table (GridDto.tables[1]). */
function gridDynamicDataNew(gridDto: GridDto, columns: GridConfigColumnDto[], newValues: Record<string, string> | undefined): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    // A column of newValues is a label with its value (set by Save insert), the others empty text boxes.
    cells: columns.map(
      (column): GridCellDto => {
        const newValue = column.columnName !== undefined ? newValues?.[column.columnName] : undefined;
        return newValue !== undefined
          ? { cellEnum: GridCellEnum.Label, text: newValue, columnName: column.columnName, rowIndex, isNew: true }
          : { cellEnum: GridCellEnum.Edit, columnName: column.columnName, placeHolder: 'New', rowIndex, isNew: true };
      },
    ),
  };

  dataTable.rows = [...rows, newRow];
}
