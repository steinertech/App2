import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { debugContentLoad, debugContentLoadByIds, debugContentUpdate, debugContentInsert, debugContentDelete, debugPropertyLoadByIds, debugPropertyLoadByOwners, debugPropertyUpdate, debugPropertyInsert, gridDebugPropertyName } from '../util/util-debug-property.js';
import { DebugContentDto, DebugPropertyDto } from '../dto/debug-property-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumnChooserLoad, gridColumnChooserOk, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridIsCommand, gridLookupSet, gridPatchDeleteMulti, gridSelectedMultiRowKeys, gridTables } from '../util/util-grid.js';
import { gridDebugDeleteConfirm, gridDebugNew } from './grid-debug.js';
import { indexToColumnNameExcel } from '../util/util-main.js';

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
 * the selected row (ownerName is its name, ownerType "Row") and, if a column is selected, the selected cell (ownerName is name + "." + columnName, ownerType "Cell").
 * None if no row is selected.
 */
async function gridDebugContentSelectedOwners(request: Request, gridDto: GridDto): Promise<DebugPropertyOwner[]> {
  const selected = gridDto.state?.selectedRowIndex;
  const rowKey = selected !== undefined ? gridDto.state?.rowKeys?.[selected] : undefined;
  const content = rowKey !== undefined ? (await debugContentLoadByIds(request, [rowKey]))[0] : undefined;
  if (content === undefined) {
    return [];
  }
  const name = content.name ?? '';
  const columnName = gridDto.state?.selectedColumnName;
  return [{ ownerName: name, ownerType: 'Row' }, ...(columnName !== undefined ? [{ ownerName: name + '.' + columnName, ownerType: 'Cell' }] : [])];
}

/**
 * Returns the owners of the debug property grid's rows: the selected cell of the debug table grid (ownerName is rowIndex + "." + columnName, ownerType "CellTable")
 * if one is selected (and a debug content row, whose RowCount and ColumnCount size the table), otherwise owners (see gridDebugContentSelectedOwners).
 */
function gridDebugPropertyOwners(owners: DebugPropertyOwner[], tableGridDto: GridDto): DebugPropertyOwner[] {
  const rowIndex = tableGridDto.state?.selectedRowIndex;
  const columnName = tableGridDto.state?.selectedColumnName;
  if (owners.length === 0 || rowIndex === undefined || columnName === undefined) {
    return owners;
  }
  return [{ ownerName: rowIndex + '.' + columnName, ownerType: 'CellTable' }];
}

async function gridDebugContentLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  // Column Chooser Ok: apply the chosen columns (GridStateDto.columnNames) before the rows are built.
  gridColumnChooserOk(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? []);

  // Selection is by rowIndex: remember it by rowKey so it can be mapped onto the reloaded rows (deleted rows drop out).
  const selectedMultiRowKeys = new Set(gridSelectedMultiRowKeys(gridDto));

  // Delete confirmation (opened by a row's Delete button or the toolbar's DeleteMulti button below) lives at gridDto.planes[1].grids[0] (planes[0] is the lookup), carrying GridStateDto.custom.rowKeys.
  const confirmGridDto = gridDto.planes?.[1]?.grids?.[0];
  if (confirmGridDto !== undefined) {
    // Its Cancel button (GridCustomEnum.Cancel) closes the dialog in App.Web without a server call.
    if (gridIsCommand(confirmGridDto, 'Yes')) {
      const rowKeys = confirmGridDto.state?.custom?.rowKeys;
      if (Array.isArray(rowKeys)) {
        await debugContentDelete(request, rowKeys.filter((rowKey): rowKey is string => typeof rowKey === 'string'));
      }
      gridDto.planes = undefined;
    } else {
      // Rows aren't sent back by the client: rebuild them so the dialog stays visible across other commands.
      gridDto.planes = [null, { grids: [{ ...gridDebugDeleteConfirm(confirmGridDto.state?.custom?.rowKeys), command: undefined }] }];
    }
  }

  if (gridIsCommand(gridDto, 'Delete')) {
    const rowIndex = gridDto.command?.rowIndex;
    const rowKey = rowIndex !== undefined ? gridDto.state?.rowKeys?.[rowIndex] : undefined;
    if (rowKey !== undefined) {
      gridDto.planes = [null, { grids: [gridDebugDeleteConfirm([rowKey])] }];
    }
  }

  if (gridIsCommand(gridDto, 'DeleteMulti') && selectedMultiRowKeys.size > 0) {
    gridDto.planes = [null, { grids: [gridDebugDeleteConfirm([...selectedMultiRowKeys])] }];
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDebugContentSaveUpdate(request, gridDto);
    await gridDebugContentSaveInsert(request, gridDto);
  }

  const allContents = await debugContentLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? [], allContents);

  // Filter-Sort-Page: contents holds only the rows of the current page.
  const { rows: contents, state: fspState } = gridFsp(allContents, DEBUG_CONTENT_COLUMNS.columns ?? [], gridDto.state);
  const columns = gridColumns(DEBUG_CONTENT_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: [
      ...columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort, column.text)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = contents.map((content, rowIndex) => ({
    cells: [
      ...columns.map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: gridCellText(content[column.columnName as keyof DebugContentDto], column),
          rowIndex,
          columnName: column.columnName,
          isSelectMulti: columnIndex === 0 ? true : undefined,
        }),
      ),
      {
        cellEnum: GridCellEnum.Custom,
        customs: [{ text: 'Delete', name: 'Delete', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto],
        rowIndex,
      },
    ],
  }));

  // rowKey is the _id (ObjectId hex), since name is editable.
  const rowKeys: string[] = contents.map((content) => content._id?.toHexString() ?? '');
  const isSelectedMulti = rowKeys.map((rowKey) => selectedMultiRowKeys.has(rowKey));
  const findRow = gridFindRow([...columns.map((column) => column.columnName), undefined]);

  const toolbarRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { text: 'Column Chooser', name: 'ColumnChooser', customEnum: GridCustomEnum.ColumnChooser },
          {
            text: 'Delete',
            name: 'DeleteMulti',
            customEnum: GridCustomEnum.Button,
            isDisabled: !isSelectedMulti.some((isSelected) => isSelected),
          },
        ],
      },
    ],
  };

  const result: GridDto = {
    ...gridDto,
    title: 'Debug Content',
    tables: gridTables([toolbarRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys, isSelectedMulti },
    setting: { isSelectPatch: true, isSelectColumnPatch: true, isSelectMultiPatch: true },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDebugNew(result, columns);
  }

  // Lookup (planes[0]): Column Chooser (opened by planeDebugPropertyPatch, kept open while planes[0].planeName is columnChooser)
  // or Filter Multi (opened by planeDebugPropertyPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridColumnChooserLoad(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? []) ?? gridFilterMultiLoad(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? [], allContents));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
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
    gridDebugNew(result, columns);
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
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const properties = await debugPropertyLoadByIds(request, ids);

  const columns = gridColumns(DEBUG_PROPERTY_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const property = properties.find((property) => property._id?.toHexString() === rowKey);
    if (property) {
      (property as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  // A "CellTable" property's name is always derived (see gridDebugPropertyName), also if its owner or property changed.
  for (const property of properties) {
    if (property.ownerType === 'CellTable') {
      property.name = gridDebugPropertyName(property);
    }
  }

  await debugPropertyUpdate(request, properties);
}

async function gridDebugPropertySaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(DEBUG_PROPERTY_COLUMNS.columns ?? []);

  const propertiesByRowIndex = new Map<number, DebugPropertyDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const property = propertiesByRowIndex.get(modify.rowIndex) ?? {};
    (property as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    propertiesByRowIndex.set(modify.rowIndex, property);
  }

  for (const property of propertiesByRowIndex.values()) {
    property.name = gridDebugPropertyName(property);
  }

  await debugPropertyInsert(request, [...propertiesByRowIndex.values()]);
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

async function gridDebugContentSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const contents = await debugContentLoadByIds(request, ids);

  const columns = gridColumns(DEBUG_CONTENT_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const content = contents.find((content) => content._id?.toHexString() === rowKey);
    if (content) {
      (content as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await debugContentUpdate(request, contents);
}

async function gridDebugContentSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(DEBUG_CONTENT_COLUMNS.columns ?? []);

  const contentsByRowIndex = new Map<number, DebugContentDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const content = contentsByRowIndex.get(modify.rowIndex) ?? {};
    (content as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    contentsByRowIndex.set(modify.rowIndex, content);
  }

  await debugContentInsert(request, [...contentsByRowIndex.values()]);
}
