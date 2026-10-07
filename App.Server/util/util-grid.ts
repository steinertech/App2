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
      result = result.filter((row) => gridFspFilterMatch(value(row, columnName), filter.trim(), column.typeEnum));
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

/**
 * Returns true if value matches filter (trimmed, not empty). Rows without a value never match.
 * Text: case-insensitive partial match. Number: ">10", ">=10", "<10", "<=10", "=10" compare, "10..20" is an inclusive range;
 * anything else (e.g. "15") is a partial match on the number's text like a Text column.
 */
function gridFspFilterMatch(value: unknown, filter: string, typeEnum: GridConfigTypeEnum | undefined): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeEnum === GridConfigTypeEnum.Number && typeof value === 'number') {
    const numberPattern = '(-?\\d+(?:\\.\\d+)?)';
    const range = filter.match(new RegExp(`^${numberPattern}\\s*\\.\\.\\s*${numberPattern}$`));
    if (range !== null) {
      return value >= Number(range[1]) && value <= Number(range[2]);
    }
    const compare = filter.match(new RegExp(`^(>=|<=|>|<|=)\\s*${numberPattern}$`));
    if (compare !== null) {
      const number = Number(compare[2]);
      switch (compare[1]) {
        case '>=': return value >= number;
        case '<=': return value <= number;
        case '>': return value > number;
        case '<': return value < number;
        default: return value === number;
      }
    }
  }
  return String(value).toLowerCase().includes(filter.toLowerCase());
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

/** Sets lookupGridDto (e.g. Column Chooser) as the only grid of gridDto.planes[0] (with GridPlaneDto.planeName, if given), or sets planes[0] to null if undefined. App dialogs at planes[1] and up are kept; planes becomes undefined if all entries are null. */
export function gridLookupSet(gridDto: GridDto, lookupGridDto: GridDto | undefined, planeName?: string): void {
  const planes = [...(gridDto.planes ?? [])];
  planes[0] = lookupGridDto !== undefined ? { ...(planeName !== undefined && { planeName }), grids: [lookupGridDto] } : null;
  gridDto.planes = planes.some((gridPlane) => gridPlane !== null) ? planes : undefined;
}

/** GridPlaneDto.planeName of the Column Chooser lookup (gridDto.planes[0]). */
export const GRID_PLANE_COLUMN_CHOOSER = 'columnChooser';

/** The Column Chooser's single column (its rows are the parent grid's columns). */
const GRID_COLUMN_CHOOSER_COLUMNS: GridConfigColumnDto[] = [{ columnName: 'columnChooser', text: 'Column Name', typeEnum: GridConfigTypeEnum.Text }];

/** Returns the open Column Chooser lookup grid (gridDto.planes[0] with planeName GRID_PLANE_COLUMN_CHOOSER), or undefined. */
function gridColumnChooserLookup(gridDto: GridDto): GridDto | undefined {
  const lookupPlane = gridDto.planes?.[0];
  return lookupPlane?.planeName === GRID_PLANE_COLUMN_CHOOSER ? lookupPlane.grids?.[0] : undefined;
}

/**
 * Returns the column names selected in the Column Chooser lookupGridDto: GridStateDto.custom.selectedColumnNames (the selection over all pages)
 * updated with the checkboxes of the page sent back (GridStateDto.isSelectedMulti by GridStateDto.rowKeys).
 */
function gridColumnChooserSelected(lookupGridDto: GridDto): Set<string> {
  const selectedColumnNames = lookupGridDto.state?.custom?.selectedColumnNames;
  const result = new Set(Array.isArray(selectedColumnNames) ? selectedColumnNames.filter((columnName): columnName is string => typeof columnName === 'string') : []);
  const isSelectedMulti = lookupGridDto.state?.isSelectedMulti;
  if (isSelectedMulti !== undefined) {
    (lookupGridDto.state?.rowKeys ?? []).forEach((rowKey, rowIndex) => (isSelectedMulti[rowIndex] === true ? result.add(rowKey) : result.delete(rowKey)));
  }
  return result;
}

/** If the Column Chooser lookup (gridDto.planes[0]) sent GridCommandEnum.Ok, sets gridDto.state.columnNames to its selected columns (in allColumns order). */
export function gridColumnChooserOk(gridDto: GridDto, allColumns: GridConfigColumnDto[]): void {
  const lookupGridDto = gridColumnChooserLookup(gridDto);
  if (lookupGridDto?.command?.commandEnum === GridCommandEnum.Ok) {
    const selected = gridColumnChooserSelected(lookupGridDto);
    const columnNames = gridColumns(allColumns)
      .map((column) => column.columnName ?? '')
      .filter((columnName) => selected.has(columnName));
    gridDto.state = { ...gridDto.state, columnNames };
  }
}

/**
 * Sets gridDto.planes[0] to the Column Chooser lookup (see gridLoadColumnChooser) if the ColumnChooser command opened it, or if it is open
 * (incoming planes[0].planeName is GRID_PLANE_COLUMN_CHOOSER) and didn't send Ok. Otherwise it is closed.
 */
export function gridColumnChooserSet(gridDto: GridDto, incomingGridDto: GridDto, allColumns: GridConfigColumnDto[]): void {
  if (incomingGridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    gridLookupSet(gridDto, gridLoadColumnChooser(allColumns, incomingGridDto.state), GRID_PLANE_COLUMN_CHOOSER);
    return;
  }
  const lookupGridDto = gridColumnChooserLookup(incomingGridDto);
  const isOpen = lookupGridDto !== undefined && lookupGridDto.command?.commandEnum !== GridCommandEnum.Ok;
  gridLookupSet(gridDto, isOpen ? gridLoadColumnChooser(allColumns, incomingGridDto.state, lookupGridDto) : undefined, GRID_PLANE_COLUMN_CHOOSER);
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
 * Returns the multi select "Column Chooser" GridDto (used as lookup, see gridColumnChooserSet) with one row per column of allColumns, filtered, sorted
 * and paged (gridFsp) by its own state. Without lookupGridDto (just opened) a column is selected if it is in state.columnNames (all columns if
 * columnNames is undefined); otherwise the selection of the open lookupGridDto is kept (see gridColumnChooserSelected) and its SortClick is applied.
 * Its Ok button is handled by gridColumnChooserOk.
 */
export function gridLoadColumnChooser(allColumns: GridConfigColumnDto[], state: GridStateDto | undefined, lookupGridDto?: GridDto): GridDto {
  const columns = gridColumns(allColumns);
  const selected =
    lookupGridDto !== undefined
      ? gridColumnChooserSelected(lookupGridDto)
      : new Set(columns.map((column) => column.columnName ?? '').filter((columnName) => state?.columnNames === undefined || state.columnNames.includes(columnName)));

  const lookupState: GridDto = { state: lookupGridDto?.state, command: lookupGridDto?.command };
  gridCommandSortClick(lookupState);

  // Filter-Sort-Page: columnRows holds only the rows of the current page.
  const { rows: columnRows, state: fspState } = gridFsp(
    columns.map((column) => ({ columnName: column.columnName ?? '', columnChooser: column.text ?? titleCase(column.columnName) })),
    GRID_COLUMN_CHOOSER_COLUMNS,
    lookupState.state,
  );

  const headerRow: GridRowDto = { cells: [gridHeaderCell('columnChooser', lookupState.state?.sort, 'Column Name')] };
  const findRow = gridFindRow(['columnChooser']);
  const rows: GridRowDto[] = columnRows.map((columnRow, rowIndex) => ({
    cells: [{ cellEnum: GridCellEnum.Label, text: columnRow.columnChooser, rowIndex, isSelectMulti: true }],
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
  const rowKeys = columnRows.map((columnRow) => columnRow.columnName);
  return {
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()], [buttonRow]),
    state: {
      ...lookupState.state,
      ...fspState,
      rowKeys,
      isSelectedMulti: rowKeys.map((rowKey) => selected.has(rowKey)),
      custom: { ...lookupState.state?.custom, selectedColumnNames: [...selected] },
    },
    title: 'Column Chooser',
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
