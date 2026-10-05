import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPlaneDto, gridPlaneGrids, GridRowDto, GridSortDto, GridStateDto } from '../dto/shared/grid-dto.js';
import { titleCase } from './util-main.js';
import { GridConfigColumnDto } from '../dto/grid-config-dto.js';
import { gridProjectLoad } from './util-grid-project.js';
import { gridLoadUser } from './util-grid-user.js';
import { gridLoadStorage, gridLoadStoragePreview } from './util-grid-storage.js';

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
 */
export function gridColumns(columns: GridConfigColumnDto[], state: GridStateDto | undefined): GridConfigColumnDto[] {
  const columnNames = state?.columnNames;
  if (columnNames === undefined) {
    return columns;
  }
  return columnNames
    .map((columnName) => columns.find((column) => column.columnName === columnName))
    .filter((column): column is GridConfigColumnDto => column !== undefined);
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

/** Sets lookupGridDto (e.g. Column Chooser) as the only grid of gridDto.planes[0], or sets planes[0] to null if undefined. App dialogs at planes[1] and up are kept; planes becomes undefined if all entries are null. */
export function gridLookupSet(gridDto: GridDto, lookupGridDto: GridDto | undefined): void {
  const planes = [...(gridDto.planes ?? [])];
  planes[0] = lookupGridDto !== undefined ? { grids: [lookupGridDto] } : null;
  gridDto.planes = planes.some((gridPlane) => gridPlane !== null) ? planes : undefined;
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
  gridDto.state = { ...gridDto.state, sort: { columnName, isSortAsc } };
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
async function gridPatchDeleteMulti(request: Request, gridDto: GridDto): Promise<GridDto> {
  return { patches: [{ name: 'DeleteMulti', isDisabled: !gridIsAnySelectedMulti(gridDto) } satisfies GridPatchDto] };
}

/** Returns the multi select "Column Chooser" GridDto (used as lookup, see gridLookupSet) with one row per column; every column is selected initially. */
export function gridLoadColumnChooser(columns: GridConfigColumnDto[]): GridDto {
  const headerRow: GridRowDto = { cells: [{ cellEnum: GridCellEnum.Header, text: 'Column Name' }] };
  const columnRows: GridRowDto[] = columns.map((column, rowIndex) => ({
    cells: [{ cellEnum: GridCellEnum.Label, text: column.text ?? titleCase(column.columnName), rowIndex, isSelectMulti: true }],
  }));
  const cancelRow: GridRowDto = { cells: [{ cellEnum: GridCellEnum.Cancel, text: 'Cancel' }] };
  return {
    rows: [headerRow, ...columnRows, cancelRow],
    state: {
      rowKeys: columns.map((column) => column.columnName ?? ''),
      isSelectedMulti: columns.map(() => true),
    },
    setting: { title: 'Column Chooser' },
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
  storage: [gridPatchDeleteMulti],
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
