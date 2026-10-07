import { GRID_PAGE_ROW_COUNT_DEFAULT, GRID_PAGE_ROW_COUNT_MAX, GridCellDto, GridCellEnum, GridCommandEnum, GridCustomEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, gridPlaneGrids, GridRowDto, GridSortDto, GridStateDto, GridTableDto } from '../dto/shared/grid-dto.js';
import { titleCase } from './util-main.js';
import { GridConfigColumnDto, GridConfigTypeEnum } from '../dto/grid-config-dto.js';
import { gridProjectLoad } from '../grid/grid-project.js';
import { gridLoadUser } from '../grid/grid-user.js';
import { gridLoadStorage, gridLoadStoragePreview, gridPatchStorage } from '../grid/grid-storage.js';

/** Returns GridDto.tables: tables[0] toolbarRows, tables[1] dataRows, tables[2] barRows and, if given, tables[3] footerRows (e.g. a dialog's Ok and Cancel buttons). */
export function gridTables(toolbarRows: GridRowDto[], dataRows: GridRowDto[], barRows: GridRowDto[] = [], footerRows?: GridRowDto[]): GridTableDto[] {
  const result = [{ rows: toolbarRows }, { rows: dataRows }, { rows: barRows }];
  if (footerRows !== undefined) {
    result.push({ rows: footerRows });
  }
  return result;
}

/** Row with a GridCustomEnum.Bar (Reload, Save and New buttons). Goes into GridDto.tables[2] (see gridTables). */
export function gridBarRow(): GridRowDto {
  return { cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ name: 'Bar', customEnum: GridCustomEnum.Bar }] }] };
}

export function gridFindRow(columnNames: (string | undefined)[]): GridRowDto {
  return {
    cells: columnNames.map((columnName): GridCellDto =>
      columnName !== undefined
        ? { cellEnum: GridCellEnum.Search, columnName, placeHolder: 'Search' }
        : { cellEnum: GridCellEnum.Empty },
    ),
  };
}

/**
 * Returns the columns to render: if GridStateDto.columnNames is defined only those columns (in columnNames order;
 * names not found in columns are ignored, since they come back from the client), otherwise all columns.
 * Columns with isHide are never returned, so they are not sent to App.Web (nor accepted from it).
 */
export function gridColumns(columns: GridConfigColumnDto[], state?: GridStateDto): GridConfigColumnDto[] {
  const visibleColumns = columns.filter((column) => !column.isHide);
  const columnNames = state?.columnNames;
  if (columnNames === undefined) {
    return visibleColumns;
  }
  return columnNames
    .map((columnName) => visibleColumns.find((column) => column.columnName === columnName))
    .filter((column): column is GridConfigColumnDto => column !== undefined);
}

/**
 * Filter-Sort-Page: returns the rows of the current page plus the effective paging state (pageIndex, pageCount, pageRowCount; merge it into the response's GridStateDto).
 * Only the columns rendered by gridColumns(columns, state) take part, since filters and sort come back from the client:
 * - Filter: every GridStateDto.filters entry must match (see gridFspFilterMatch).
 * - Sort: by GridStateDto.sort, using the column's columnNameSort value if set. Rows without a value come last; equal values keep their original order.
 * - Page: pageRowCount defaults to 5 (max 10); pageIndex is clamped to the existing pages; pageCount is the number of pages after the filter (at least 1).
 */
export function gridFsp<T extends object>(rows: T[], columns: GridConfigColumnDto[], state: GridStateDto | undefined): { rows: T[]; state: GridStateDto } {
  const renderedColumns = gridColumns(columns, state);
  const value = (row: T, columnName: string): unknown => (row as Record<string, unknown>)[columnName];

  // Filter
  let result = rows;
  for (const [columnName, filter] of Object.entries(state?.filters ?? {})) {
    const column = renderedColumns.find((column) => column.columnName === columnName);
    if (column !== undefined && typeof filter === 'string' && filter.trim() !== '') {
      result = result.filter((row) => gridFspFilterMatch(value(row, columnName), filter.trim(), column));
    }
  }

  // Sort
  const sortColumn = renderedColumns.find((column) => column.columnName === state?.sort?.columnName);
  if (sortColumn?.columnName !== undefined) {
    const sortColumnName = sortColumn.columnNameSort ?? sortColumn.columnName;
    const typeEnum = columns.find((column) => column.columnName === sortColumnName)?.typeEnum ?? sortColumn.typeEnum;
    const direction = state?.sort?.isSortAsc === false ? -1 : 1;
    result = [...result].sort((a, b) => gridFspCompare(value(a, sortColumnName), value(b, sortColumnName), typeEnum, direction));
  }

  // Page
  const pageRowCountState = Math.trunc(state?.pageRowCount ?? GRID_PAGE_ROW_COUNT_DEFAULT);
  const pageRowCount = Number.isFinite(pageRowCountState) ? Math.min(Math.max(pageRowCountState, 1), GRID_PAGE_ROW_COUNT_MAX) : GRID_PAGE_ROW_COUNT_DEFAULT;
  const pageCount = Math.max(1, Math.ceil(result.length / pageRowCount));
  const pageIndexState = Math.trunc(state?.pageIndex ?? 0);
  const pageIndex = Number.isFinite(pageIndexState) ? Math.min(Math.max(pageIndexState, 0), pageCount - 1) : 0;

  return {
    rows: result.slice(pageIndex * pageRowCount, (pageIndex + 1) * pageRowCount),
    state: { pageIndex, pageCount, pageRowCount },
  };
}

/** Returns the cell text of a column's raw value: "" if the value is missing (undefined or null), otherwise GridConfigColumnDto.valueToText(value) if set, else String(value). */
export function gridCellText(value: unknown, column: GridConfigColumnDto): string {
  if (value === undefined || value === null) {
    return '';
  }
  return column.valueToText !== undefined ? column.valueToText(value) : String(value);
}

/** Returns the column's raw value of a cell text (e.g. GridModifyDto.textModified): GridConfigColumnDto.valueFromText(text) if set, else text itself. undefined stays undefined. */
export function gridCellValue(text: string | undefined, column: GridConfigColumnDto): unknown {
  if (text === undefined) {
    return undefined;
  }
  return column.valueFromText !== undefined ? column.valueFromText(text) : text;
}

/** Returns the number a Number column's filter operand stands for (parsed by GridConfigColumnDto.valueFromText if set, e.g. "5.6kg" → 5600), or undefined if it isn't one. */
function gridFspFilterNumber(text: string, column: GridConfigColumnDto): number | undefined {
  let result: unknown;
  try {
    result = column.valueFromText !== undefined ? column.valueFromText(text.trim()) : text.trim() !== '' ? Number(text) : undefined;
  } catch {
    // Not parsable: the filter falls back to a partial text match.
    return undefined;
  }
  return typeof result === 'number' && Number.isFinite(result) ? result : undefined;
}

/**
 * Returns true if value matches filter (trimmed, not empty). Rows without a value never match.
 * Text: case-insensitive partial match on the cell text (see gridCellText, so e.g. "kg" matches a value shown as "5.6kg").
 * Number: ">10", ">=10", "<10", "<=10", "=10" compare, "10..20" is an inclusive range (operands are parsed by the column's valueFromText
 * if set, e.g. ">5.6kg"); anything else (e.g. "15") is a partial match on the cell text like a Text column.
 */
function gridFspFilterMatch(value: unknown, filter: string, column: GridConfigColumnDto): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (column.typeEnum === GridConfigTypeEnum.Number && typeof value === 'number') {
    const range = filter.match(/^(.+?)\s*\.\.\s*(.+)$/);
    const rangeFrom = range !== null ? gridFspFilterNumber(range[1], column) : undefined;
    const rangeTo = range !== null ? gridFspFilterNumber(range[2], column) : undefined;
    if (rangeFrom !== undefined && rangeTo !== undefined) {
      return value >= rangeFrom && value <= rangeTo;
    }
    const compare = filter.match(/^(>=|<=|>|<|=)\s*(.+)$/);
    const number = compare !== null ? gridFspFilterNumber(compare[2], column) : undefined;
    if (compare !== null && number !== undefined) {
      switch (compare[1]) {
        case '>=': return value >= number;
        case '<=': return value <= number;
        case '>': return value > number;
        case '<': return value < number;
        default: return value === number;
      }
    }
  }
  return gridCellText(value, column).toLowerCase().includes(filter.toLowerCase());
}

/** Compares a and b for sorting in direction (1 asc, -1 desc). Values are compared as numbers for a Number column, otherwise as text (case-insensitive, digits by numeric value). Missing values come last in both directions. */
function gridFspCompare(a: unknown, b: unknown, typeEnum: GridConfigTypeEnum | undefined, direction: number): number {
  const isMissingA = a === undefined || a === null;
  const isMissingB = b === undefined || b === null;
  if (isMissingA || isMissingB) {
    return Number(isMissingA) - Number(isMissingB);
  }
  if (typeEnum === GridConfigTypeEnum.Number && typeof a === 'number' && typeof b === 'number') {
    return (a - b) * direction;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * direction;
}

export function gridHeaderCell(column: string | undefined, sort?: GridSortDto, text?: string): GridCellDto {
  const cell: GridCellDto = { cellEnum: GridCellEnum.Header, text: text ?? titleCase(column), columnName: column };
  if (sort && sort.columnName === column) {
    cell.isSortAsc = sort.isSortAsc;
  }
  return cell;
}

/**
 * Walks gridDto and every GridDto nested under it (via gridPlaneGrids) for the GridPlaneDto whose grids contain a GridDto
 * with the given customName command, and sets that GridPlaneDto to null in its immediate parent's planes list (other planes keep their index).
 * Returns true if found and removed.
 */
export function gridRemoveCommand(gridDto: GridDto, customName: string): boolean {
  for (const parentGridDto of gridPlaneGrids({ grids: [gridDto] })) {
    const planes = parentGridDto.planes ?? [];
    const planesIndex = planes.findIndex((gridPlane) => (gridPlane?.grids ?? []).some((nestedGridDto) => gridIsCommand(nestedGridDto, customName)));
    if (planesIndex !== -1) {
      planes[planesIndex] = null;
      return true;
    }
  }

  return false;
}

/** Walks gridDto and every GridDto nested under it (via gridPlaneGrids) for the first one whose own command matches customName. */
export function gridFindCommand(gridDto: GridDto, customName: string): GridDto | undefined {
  return gridPlaneGrids({ grids: [gridDto] }).find((nestedGridDto) => gridIsCommand(nestedGridDto, customName));
}

/**
 * Sets lookupPlane (e.g. Column Chooser, see gridColumnChooserLoad, or Filter Multi, see gridFilterMultiLoad) as gridDto.planes[0], or sets planes[0] to null if undefined.
 * App dialogs at planes[1] and up are kept; planes becomes undefined if all entries are null.
 */
export function gridLookupSet(gridDto: GridDto, lookupPlane: GridPlaneDto | undefined): void {
  const planes = [...(gridDto.planes ?? [])];
  planes[0] = lookupPlane ?? null;
  gridDto.planes = planes.some((gridPlane) => gridPlane !== null) ? planes : undefined;
}

/** GridPlaneDto.planeName of the Column Chooser lookup (gridDto.planes[0]). */
export const GRID_PLANE_COLUMN_CHOOSER = 'columnChooser';

/** GridPlaneDto.planeName of the Filter Multi lookup (gridDto.planes[0]). */
export const GRID_PLANE_FILTER_MULTI = 'filterMulti';

/** Returns the open lookup grid gridDto.planes[0] if its GridPlaneDto.planeName is planeName, or undefined. */
function gridLookup(gridDto: GridDto, planeName: string): GridDto | undefined {
  const lookupPlane = gridDto.planes?.[0];
  return lookupPlane?.planeName === planeName ? lookupPlane.grids?.[0] : undefined;
}

/** One row of a multi select lookup (see gridLoadLookupMulti): rowKey identifies it, text is shown, value is sorted by. */
interface GridLookupMultiRow {
  rowKey: string;
  text: string;
  value: unknown;
}

/**
 * Returns the rowKeys selected in the multi select lookupGridDto (see gridLoadLookupMulti): GridStateDto.custom.selectedRowKeys (the selection over all pages)
 * updated with the checkboxes of the page sent back (GridStateDto.isSelectedMulti by GridStateDto.rowKeys).
 */
function gridLookupMultiSelected(lookupGridDto: GridDto): Set<string> {
  const selectedRowKeys = lookupGridDto.state?.custom?.selectedRowKeys;
  const result = new Set(Array.isArray(selectedRowKeys) ? selectedRowKeys.filter((rowKey): rowKey is string => typeof rowKey === 'string') : []);
  const isSelectedMulti = lookupGridDto.state?.isSelectedMulti;
  if (isSelectedMulti !== undefined) {
    (lookupGridDto.state?.rowKeys ?? []).forEach((rowKey, rowIndex) => (isSelectedMulti[rowIndex] === true ? result.add(rowKey) : result.delete(rowKey)));
  }
  return result;
}

/** Returns the Column Chooser's rows: one per column of allColumns (rowKey columnName). */
function gridColumnChooserRows(allColumns: GridConfigColumnDto[]): GridLookupMultiRow[] {
  return gridColumns(allColumns).map((column) => {
    const text = column.text ?? titleCase(column.columnName) ?? '';
    return { rowKey: column.columnName ?? '', text, value: text };
  });
}

/** If the Column Chooser lookup (gridDto.planes[0]) sent GridCommandEnum.Ok, sets gridDto.state.columnNames to its selected columns (in allColumns order). */
export function gridColumnChooserOk(gridDto: GridDto, allColumns: GridConfigColumnDto[]): void {
  const lookupGridDto = gridLookup(gridDto, GRID_PLANE_COLUMN_CHOOSER);
  if (lookupGridDto?.command?.commandEnum === GridCommandEnum.Ok) {
    const selected = gridLookupMultiSelected(lookupGridDto);
    const columnNames = gridColumnChooserRows(allColumns)
      .map((lookupRow) => lookupRow.rowKey)
      .filter((columnName) => selected.has(columnName));
    gridDto.state = { ...gridDto.state, columnNames };
  }
}

/**
 * Returns the Column Chooser lookup plane (set it with gridLookupSet, or send it as GridPatchEnum.Lookup) if the incoming GridCommandEnum.ColumnChooser opened it, or if it is open
 * (incoming planes[0].planeName is GRID_PLANE_COLUMN_CHOOSER) and didn't send Ok. Otherwise undefined.
 * A column is selected initially if it is in GridStateDto.columnNames (all columns if columnNames is undefined). Its Ok button is handled by gridColumnChooserOk.
 */
export function gridColumnChooserLoad(incomingGridDto: GridDto, allColumns: GridConfigColumnDto[]): GridPlaneDto | undefined {
  const isOpening = incomingGridDto.command?.commandEnum === GridCommandEnum.ColumnChooser;
  const lookupGridDto = isOpening ? undefined : gridLookup(incomingGridDto, GRID_PLANE_COLUMN_CHOOSER);
  if (!isOpening && (lookupGridDto === undefined || lookupGridDto.command?.commandEnum === GridCommandEnum.Ok)) {
    return undefined;
  }
  const lookupRows = gridColumnChooserRows(allColumns);
  const columnNames = incomingGridDto.state?.columnNames;
  const selectedInitial = new Set(lookupRows.map((lookupRow) => lookupRow.rowKey).filter((columnName) => columnNames === undefined || columnNames.includes(columnName)));
  return {
    planeName: GRID_PLANE_COLUMN_CHOOSER,
    grids: [gridLoadLookupMulti('Column Chooser', 'columnChooser', 'Column Name', GridConfigTypeEnum.Text, lookupRows, selectedInitial, lookupGridDto)],
  };
}

/** Returns the rendered column (see gridColumns) named columnName, or undefined (columnName comes back from the client). */
function gridFilterMultiColumn(allColumns: GridConfigColumnDto[], state: GridStateDto | undefined, columnName: unknown): GridConfigColumnDto | undefined {
  return typeof columnName === 'string' ? gridColumns(allColumns, state).find((column) => column.columnName === columnName) : undefined;
}

/** Returns the Filter Multi's rows: the distinct, not empty cell texts (gridCellText, so GridConfigColumnDto.valueToText) of column in rows (rowKey is the text), sorted by value. */
function gridFilterMultiRows<T extends object>(rows: T[], column: GridConfigColumnDto): GridLookupMultiRow[] {
  const result = new Map<string, GridLookupMultiRow>();
  for (const row of rows) {
    const value = (row as Record<string, unknown>)[column.columnName ?? ''];
    const text = gridCellText(value, column);
    if (text !== '' && !result.has(text)) {
      result.set(text, { rowKey: text, text, value });
    }
  }
  return [...result.values()].sort((a, b) => gridFspCompare(a.value, b.value, column.typeEnum, 1));
}

/**
 * If the Filter Multi lookup (gridDto.planes[0]) sent GridCommandEnum.Ok, sets gridDto.state.filterMultis of its column to the selected texts
 * (in gridFilterMultiRows order; the entry is removed if all texts of rows are selected) and goes back to the first page.
 */
export function gridFilterMultiOk<T extends object>(gridDto: GridDto, allColumns: GridConfigColumnDto[], rows: T[]): void {
  const lookupGridDto = gridLookup(gridDto, GRID_PLANE_FILTER_MULTI);
  if (lookupGridDto?.command?.commandEnum !== GridCommandEnum.Ok) {
    return;
  }
  const column = gridFilterMultiColumn(allColumns, gridDto.state, lookupGridDto.state?.custom?.columnName);
  if (column?.columnName === undefined) {
    return;
  }
  const selected = gridLookupMultiSelected(lookupGridDto);
  const lookupRows = gridFilterMultiRows(rows, column);
  const filterMultis = { ...gridDto.state?.filterMultis };
  if (lookupRows.every((lookupRow) => selected.has(lookupRow.rowKey))) {
    delete filterMultis[column.columnName];
  } else {
    filterMultis[column.columnName] = { texts: lookupRows.filter((lookupRow) => selected.has(lookupRow.rowKey)).map((lookupRow) => lookupRow.text) };
  }
  gridDto.state = { ...gridDto.state, filterMultis: Object.keys(filterMultis).length > 0 ? filterMultis : undefined, pageIndex: 0 };
}

/**
 * Returns the Filter Multi lookup plane (set it with gridLookupSet, or send it as GridPatchEnum.Lookup) if the incoming GridCommandEnum.FilterMulti opened it
 * (for command.columnName), or if it is open (incoming planes[0].planeName is GRID_PLANE_FILTER_MULTI; its column is GridStateDto.custom.columnName) and didn't send Ok.
 * Otherwise (or if the column isn't rendered) undefined. Its rows are the distinct cell texts of the column in rows (see gridFilterMultiRows); a text is selected
 * initially if it is in GridStateDto.filterMultis of the column (all texts if there is no entry). Its Ok button is handled by gridFilterMultiOk.
 */
export function gridFilterMultiLoad<T extends object>(incomingGridDto: GridDto, allColumns: GridConfigColumnDto[], rows: T[]): GridPlaneDto | undefined {
  const isOpening = incomingGridDto.command?.commandEnum === GridCommandEnum.FilterMulti;
  const lookupGridDto = isOpening ? undefined : gridLookup(incomingGridDto, GRID_PLANE_FILTER_MULTI);
  if (!isOpening && (lookupGridDto === undefined || lookupGridDto.command?.commandEnum === GridCommandEnum.Ok)) {
    return undefined;
  }
  const columnName = isOpening ? incomingGridDto.command?.columnName : lookupGridDto?.state?.custom?.columnName;
  const column = gridFilterMultiColumn(allColumns, incomingGridDto.state, columnName);
  if (column?.columnName === undefined) {
    return undefined;
  }
  const lookupRows = gridFilterMultiRows(rows, column);
  const texts = incomingGridDto.state?.filterMultis?.[column.columnName]?.texts;
  const selectedInitial = new Set(Array.isArray(texts) ? texts : lookupRows.map((lookupRow) => lookupRow.rowKey));
  return {
    planeName: GRID_PLANE_FILTER_MULTI,
    grids: [
      gridLoadLookupMulti('Filter Multi', 'filterMulti', column.text ?? titleCase(column.columnName) ?? '', column.typeEnum, lookupRows, selectedInitial, lookupGridDto, {
        columnName: column.columnName,
      }),
    ],
  };
}

export function gridIsCommand(gridDto: GridDto, customName: string): boolean {
  return gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === customName;
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
  // Sort changed: back to the first page, with no row selected.
  gridDto.state = { ...gridDto.state, sort: { columnName, isSortAsc }, pageIndex: 0, selected: undefined, isSelectedMulti: undefined };
}

/** Returns true if one or more GridStateDto.isSelectedMulti entries are true. */
export function gridIsAnySelectedMulti(gridDto: GridDto): boolean {
  return (gridDto.state?.isSelectedMulti ?? []).some((isSelected) => isSelected === true);
}

/** Returns the GridStateDto.rowKeys of the rows whose GridStateDto.isSelectedMulti entry is true. */
export function gridSelectedMultiRowKeys(gridDto: GridDto): string[] {
  const rowKeys = gridDto.state?.rowKeys ?? [];
  return (gridDto.state?.isSelectedMulti ?? [])
    .map((isSelected, rowIndex) => (isSelected ? rowKeys[rowIndex] : undefined))
    .filter((rowKey): rowKey is string => rowKey !== undefined);
}

/** Enables the DeleteMulti button if one or more rows are selected. */
export async function gridPatchDeleteMulti(request: Request, gridDto: GridDto): Promise<GridDto> {
  return { patches: [{ patchEnum: GridPatchEnum.Button, name: 'DeleteMulti', isDisabled: !gridIsAnySelectedMulti(gridDto) } satisfies GridPatchDto] };
}

/**
 * Returns a multi select lookup GridDto (title; a single column columnName with header columnText, sorted by GridLookupMultiRow.value as typeEnum) with one row
 * per lookupRows entry, filtered, sorted and paged (gridFsp) by its own state, plus Ok and Cancel buttons. Used by the Column Chooser (see gridColumnChooserLoad)
 * and the Filter Multi (see gridFilterMultiLoad). Without lookupGridDto (just opened) the rows of selectedInitial are selected; otherwise the selection of the
 * open lookupGridDto is kept (see gridLookupMultiSelected) and its SortClick is applied. custom is merged into GridStateDto.custom.
 */
function gridLoadLookupMulti(
  title: string,
  columnName: string,
  columnText: string,
  typeEnum: GridConfigTypeEnum | undefined,
  lookupRows: GridLookupMultiRow[],
  selectedInitial: Set<string>,
  lookupGridDto: GridDto | undefined,
  custom?: Record<string, unknown>,
): GridDto {
  const selected = lookupGridDto !== undefined ? gridLookupMultiSelected(lookupGridDto) : selectedInitial;

  const lookupState: GridDto = { state: lookupGridDto?.state, command: lookupGridDto?.command };
  gridCommandSortClick(lookupState);

  // Filter-Sort-Page: pageRows holds only the rows of the current page.
  const columns: GridConfigColumnDto[] = [
    { columnName, text: columnText, typeEnum: GridConfigTypeEnum.Text, columnNameSort: 'value' },
    { columnName: 'value', typeEnum, isHide: true },
  ];
  const { rows: pageRows, state: fspState } = gridFsp(
    lookupRows.map((lookupRow) => ({ rowKey: lookupRow.rowKey, [columnName]: lookupRow.text, value: lookupRow.value })),
    columns,
    lookupState.state,
  );

  const headerRow: GridRowDto = { cells: [gridHeaderCell(columnName, lookupState.state?.sort, columnText)] };
  const findRow = gridFindRow([columnName]);
  const rows: GridRowDto[] = pageRows.map((pageRow, rowIndex) => ({
    cells: [{ cellEnum: GridCellEnum.Label, text: String(pageRow[columnName]), rowIndex, isSelectMulti: true }],
  }));
  const buttonRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { text: 'Ok', customEnum: GridCustomEnum.Ok },
          { text: 'Cancel', customEnum: GridCustomEnum.Cancel },
        ],
      },
    ],
  };
  const rowKeys = pageRows.map((pageRow) => pageRow.rowKey);
  return {
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()], [buttonRow]),
    state: {
      ...lookupState.state,
      ...fspState,
      rowKeys,
      isSelectedMulti: rowKeys.map((rowKey) => selected.has(rowKey)),
      custom: { ...lookupState.state?.custom, ...custom, selectedRowKeys: [...selected] },
    },
    title,
  };
}

type GridLoader = (request: Request, gridDto: GridDto) => Promise<GridDto>;

const PLANE_GRID_LOADERS: Record<string, GridLoader[]> = {
  debug: [gridProjectLoad],
  project: [gridProjectLoad, gridLoadUser],
  storage: [gridLoadStorage],
};

/** Returns grids (as loaded by PLANE_GRID_LOADERS) plus any grid that depends on another grid of the plane, e.g. a detail grid of the selected row. */
type GridPlaneLoader = (request: Request, grids: GridDto[]) => Promise<GridDto[]>;

const PLANE_LOADERS: Record<string, GridPlaneLoader> = {
  storage: gridLoadStoragePreview,
};

export async function gridPlaneLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const loaders = gridPlaneDto.planeName !== undefined ? (PLANE_GRID_LOADERS[gridPlaneDto.planeName] ?? []) : [];
  const planeLoader = gridPlaneDto.planeName !== undefined ? PLANE_LOADERS[gridPlaneDto.planeName] : undefined;
  const incomingGrids = gridPlaneDto.grids ?? [];

  const grids = await Promise.all(
    loaders.map((loader, gridIndex): Promise<GridDto> => {
      const gridDto: GridDto = incomingGrids[gridIndex] ?? {};
      gridCommandSortClick(gridDto);
      return loader(request, gridDto);
    }),
  );

  return { grids: planeLoader !== undefined ? await planeLoader(request, grids) : grids };
}

type GridPatcher = (request: Request, gridDto: GridDto) => Promise<GridDto>;

const PLANE_GRID_PATCHERS: Record<string, GridPatcher[]> = {
  debug: [gridPatchDeleteMulti],
  project: [gridPatchDeleteMulti],
  storage: [gridPatchStorage],
};

export async function gridPlanePatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const patchers = gridPlaneDto.planeName !== undefined ? (PLANE_GRID_PATCHERS[gridPlaneDto.planeName] ?? []) : [];
  const incomingGrids = gridPlaneDto.grids ?? [];

  const grids = await Promise.all(
    patchers.map((patcher, gridIndex): Promise<GridDto> => {
      const gridDto: GridDto = incomingGrids[gridIndex] ?? {};
      return patcher(request, gridDto);
    }),
  );

  return { grids };
}
