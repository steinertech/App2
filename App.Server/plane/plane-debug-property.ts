import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { debugContentLoad, debugContentLoadByIds, debugPropertyLoadByOwners, debugPropertyUpdate, debugPropertyInsert, gridDebugPropertyName } from '../util/db/util-debug-property.js';
import { DebugContentDto, DebugPropertyDto } from '../dto/db/debug-property-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridColumnChooserLoad, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridPatchDeleteMulti, gridTables } from '../util/core/util-grid.js';
import { gridDataLoad, gridDataNew, gridDataSaveInsert, gridDataSaveUpdate } from '../util/core/util-grid-data.js';
import { indexToColumnNameExcel } from '../util/core/util-main.js';

const DEBUG_CONTENT_COLUMNS: GridConfigDto = {
  columns: (['name', 'text'] as const satisfies readonly (keyof DebugContentDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

const DEBUG_PROPERTY_COLUMNS: GridConfigDto = {
  columns: (['name', 'ownerName', 'ownerType', 'propertyName', 'propertyValue'] as const satisfies readonly (keyof DebugPropertyDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/**
 * Loads the "debugProperty" plane: the debug content grid (GridPlaneDto.grids[0]), the debug property grid (grids[1])
 * and the debug table grid (grids[2]) sized by the selected row's RowCount and ColumnCount properties.
 */
export async function planeDebugPropertyLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  // The debug property grid depends on the reloaded debug content grid (its selected row and column), so it is built afterwards.
  const gridDto = await gridDebugContentLoad(request, gridPlaneDto.grids?.[0] ?? {});
  const owners = await gridDebugContentSelectedOwners(request, gridDto);
  const tableGridDtoIn = gridPlaneDto.grids?.[2] ?? {};
  const propertyGridDto = await gridDebugPropertyLoad(request, gridPlaneDto.grids?.[1] ?? {}, gridDebugPropertyOwners(owners, tableGridDtoIn));
  // Built after the debug property grid, which may have saved changed properties.
  const tableGridDto = await gridDebugTableLoad(request, tableGridDtoIn, owners);
  return { ...gridPlaneDto, grids: [gridDto, propertyGridDto, tableGridDto] };
}

type DebugPropertyOwner = Parameters<typeof debugPropertyLoadByOwners>[1][number];

/**
 * Returns the owners of the debug property grid's rows for the selected cell of the debug content grid (its rowKey is the _id):
 * the selected row (ownerName is "Name/<name>/", ownerType "Row") and, if a column is selected, the selected cell (ownerName is "Name/<name>/ColumnName/<columnName>/", ownerType "Cell").
 * None if no row is selected.
 */
async function gridDebugContentSelectedOwners(request: Request, gridDto: GridDto): Promise<DebugPropertyOwner[]> {
  const selected = gridDto.state?.selectedRowIndex;
  const rowKey = selected !== undefined ? gridDto.state?.rowKeys?.[selected] : undefined;
  const content = rowKey !== undefined ? (await debugContentLoadByIds(request, [rowKey]))[0] : undefined;
  if (content === undefined) {
    return [];
  }
  // DebugContentDto.name is entered by the user (a plain value, not a path), so it gets its own "Name" segment.
  const ownerName = 'Name/' + (content.name ?? '') + '/';
  const columnName = gridDto.state?.selectedColumnName;
  return [{ ownerName, ownerType: 'Row' }, ...(columnName !== undefined ? [{ ownerName: ownerName + 'ColumnName/' + columnName + '/', ownerType: 'Cell' }] : [])];
}

/**
 * Returns the owners of the debug property grid's rows: the selected cell of the debug table grid (ownerName is "RowIndex/<rowIndex>/ColumnName/<columnName>/", ownerType "CellTable")
 * if one is selected (and a debug content row, whose RowCount and ColumnCount size the table), otherwise owners (see gridDebugContentSelectedOwners).
 */
function gridDebugPropertyOwners(owners: DebugPropertyOwner[], tableGridDto: GridDto): DebugPropertyOwner[] {
  const rowIndex = tableGridDto.state?.selectedRowIndex;
  const columnName = tableGridDto.state?.selectedColumnName;
  if (owners.length === 0 || rowIndex === undefined || columnName === undefined) {
    return owners;
  }
  return [{ ownerName: 'RowIndex/' + rowIndex + '/ColumnName/' + columnName + '/', ownerType: 'CellTable' }];
}

async function gridDebugContentLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  return gridDataLoad<DebugContentDto>(
    request,
    'DebugContentDto',
    gridDto,
    { title: 'Debug Content', columns: DEBUG_CONTENT_COLUMNS.columns ?? [], isColumnChooser: true, setting: { isSelectPatch: true, isSelectColumnPatch: true } },
    false,
  );
}

/** Debug property grid: the properties of owners (see gridDebugPropertyOwners); rows can be added (New), edited and saved; no Column Chooser and no Delete. */
async function gridDebugPropertyLoad(request: Request, gridDto: GridDto, owners: DebugPropertyOwner[]): Promise<GridDto> {
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDebugPropertySaveUpdate(request, gridDto);
    await gridDebugPropertySaveInsert(request, gridDto);
  }

  const allProperties = await debugPropertyLoadByOwners(request, owners);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DEBUG_PROPERTY_COLUMNS.columns ?? [], allProperties);

  // Filter-Sort-Page: properties holds only the rows of the current page.
  const { rows: properties, state: fspState } = gridFsp(allProperties, DEBUG_PROPERTY_COLUMNS.columns ?? [], gridDto.state);
  const columns = gridColumns(DEBUG_PROPERTY_COLUMNS.columns ?? []);

  const headerRow: GridRowDto = {
    cells: columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort, column.text)),
  };
  const rows: GridRowDto[] = properties.map((property, rowIndex) => ({
    cells: columns.map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText(property[column.columnName as keyof DebugPropertyDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex), since name is editable.
  const rowKeys: string[] = properties.map((property) => property._id?.toHexString() ?? '');
  const findRow = gridFindRow(columns.map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: 'Debug Property',
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
    setting: { isReloadPatch: true },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDataNew(result, columns);
  }

  // Lookup (planes[0]): Filter Multi (opened by planeDebugPropertyPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, DEBUG_PROPERTY_COLUMNS.columns ?? [], allProperties));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/** Parses a RowCount or ColumnCount propertyValue: a whole number clamped to 0..50, or undefined if empty or not a whole number. */
function gridDebugTableCount(text: string | undefined): number | undefined {
  const trimmed = (text ?? '').trim();
  const value = Number(trimmed);
  return trimmed !== '' && Number.isInteger(value) ? Math.min(Math.max(value, 0), 50) : undefined;
}

/**
 * Builds the debug table grid: if the properties of owners with ownerType "Row" have a valid RowCount and ColumnCount (see gridDebugTableCount),
 * ColumnCount header columns (named A, B, C, ... by indexToColumnNameExcel) and RowCount rows (each cell "Empty"); otherwise no columns and no rows.
 * Read only, so no find row, sort, paging, Save or Reload. The selected cell of gridDto is kept if it is still in the table.
 */
async function gridDebugTableLoad(request: Request, gridDto: GridDto, owners: DebugPropertyOwner[]): Promise<GridDto> {
  const rowOwners = owners.filter((owner) => owner.ownerType === 'Row');
  const properties = rowOwners.length > 0 ? await debugPropertyLoadByOwners(request, rowOwners) : [];
  const propertyValue = (propertyName: string) => properties.find((property) => property.ownerType === 'Row' && property.propertyName === propertyName)?.propertyValue;
  const rowCount = gridDebugTableCount(propertyValue('RowCount'));
  const columnCount = gridDebugTableCount(propertyValue('ColumnCount'));
  const isValid = rowCount !== undefined && columnCount !== undefined;

  const columnNames = Array.from({ length: isValid ? columnCount : 0 }, (_, columnIndex) => indexToColumnNameExcel(columnIndex));
  // No columnName on the header cells: clicking them doesn't sort and they have no filter button.
  const headerRow: GridRowDto = { cells: columnNames.map((columnName) => gridHeaderCell(undefined, undefined, columnName)) };
  // rowIndex and columnName make a clicked cell selectable; its Select (isSelectPatch, isSelectColumnPatch) shows the cell's "CellTable" properties in the debug property grid.
  const rows: GridRowDto[] = Array.from({ length: isValid ? rowCount : 0 }, (_, rowIndex) => ({
    cells: columnNames.map((columnName): GridCellDto => ({ cellEnum: GridCellEnum.Label, text: 'Empty', rowIndex, columnName })),
  }));

  const selectedRowIndex = gridDto.state?.selectedRowIndex;
  const selectedColumnName = gridDto.state?.selectedColumnName;
  const isSelected = selectedRowIndex !== undefined && selectedRowIndex < rows.length && selectedColumnName !== undefined && columnNames.includes(selectedColumnName);

  return {
    title: 'Debug Table',
    tables: gridTables([], columnNames.length > 0 ? [headerRow, ...rows] : []),
    state: isSelected ? { selectedRowIndex, selectedColumnName } : {},
    setting: { isSelectPatch: true, isSelectColumnPatch: true },
  };
}

async function gridDebugPropertySaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const properties = await gridDataSaveUpdate<DebugPropertyDto>(request, 'DebugPropertyDto', gridDto, DEBUG_PROPERTY_COLUMNS.columns ?? [], false);

  // A "CellTable" property's name is always derived (see gridDebugPropertyName), also if its owner or property changed.
  for (const property of properties) {
    if (property.ownerType === 'CellTable') {
      property.name = gridDebugPropertyName(property);
    }
  }

  await debugPropertyUpdate(request, properties);
}

async function gridDebugPropertySaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const properties = gridDataSaveInsert<DebugPropertyDto>(gridDto, DEBUG_PROPERTY_COLUMNS.columns ?? []);

  for (const property of properties) {
    property.name = gridDebugPropertyName(property);
  }

  await debugPropertyInsert(request, properties);
}

/**
 * Patches the "debugProperty" plane's grids (debug content grid GridPlaneDto.grids[0], debug property grid grids[1], debug table grid grids[2]): GridCommandEnum.ColumnChooser opens the Column Chooser lookup,
 * GridCommandEnum.FilterMulti the Filter Multi lookup (distinct texts of its column), GridCommandEnum.Select of a debug content grid cell (GridSettingDto.isSelectPatch, isSelectColumnPatch)
 * replaces the debug property grid with the properties of the selected row and cell and the debug table grid with the table sized by them;
 * GridCommandEnum.Select of a debug table grid cell replaces the debug property grid with the properties of that cell (ownerType "CellTable");
 * any other command of the debug content grid (MultiClick) enables/disables the DeleteMulti button.
 */
export async function planeDebugPropertyPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  const propertyGridDto = gridPlaneDto.grids?.[1] ?? {};
  // The incoming state of the debug content grid carries the selected row and column and the rowKeys of the loaded rows.
  const owners = await gridDebugContentSelectedOwners(request, gridDto);
  // The incoming state of the debug table grid carries its selected cell.
  const tableGridDto = gridPlaneDto.grids?.[2] ?? {};
  const propertyOwners = gridDebugPropertyOwners(owners, tableGridDto);
  // Reload of the debug property grid (GridSettingDto.isReloadPatch): no other grid depends on it, so only it is rebuilt.
  if (propertyGridDto.command?.commandEnum === GridCommandEnum.Reload) {
    const grid = await gridDebugPropertyLoad(request, propertyGridDto, propertyOwners);
    const tableGrid = await gridDebugTableLoad(request, tableGridDto, owners);
    return {
      ...gridPlaneDto,
      grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] }, { patches: [{ patchEnum: GridPatchEnum.Grid, grid: tableGrid } satisfies GridPatchDto] }],
    };
  }
  if (propertyGridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(propertyGridDto, DEBUG_PROPERTY_COLUMNS.columns ?? [], await debugPropertyLoadByOwners(request, propertyOwners));
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}] };
  }
  if (propertyGridDto.command !== undefined) {
    return { ...gridPlaneDto, grids: [{}, {}, {}] };
  }
  // Other rows are shown in the debug property grid: start on the first page with no selection, sort or filter, and drop the pending command, unsaved modifies and an open lookup.
  const propertyGridDtoSelect: GridDto = {
    ...propertyGridDto,
    command: undefined,
    modifies: undefined,
    planes: undefined,
    state: { ...propertyGridDto.state, selectedRowIndex: undefined, selectedColumnName: undefined, isSelectedMulti: undefined, pageIndex: 0, sort: undefined, filters: undefined, filterMultis: undefined },
  };
  if (tableGridDto.command?.commandEnum === GridCommandEnum.Select) {
    // The debug table grid keeps its selection (App.Web keeps the sent state), only the debug property grid is replaced.
    const grid = await gridDebugPropertyLoad(request, propertyGridDtoSelect, propertyOwners);
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] }, {}] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.Select) {
    // The debug table grid is rebuilt with no selection, so the debug property grid shows the properties of the selected row and cell.
    const grid = await gridDebugPropertyLoad(request, propertyGridDtoSelect, owners);
    const tableGrid = await gridDebugTableLoad(request, {}, owners);
    return {
      ...gridPlaneDto,
      grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] }, { patches: [{ patchEnum: GridPatchEnum.Grid, grid: tableGrid } satisfies GridPatchDto] }],
    };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = gridColumnChooserLoad(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? []);
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}, {}] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? [], await debugContentLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}, {}] };
  }
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridDto), {}, {}] };
}
