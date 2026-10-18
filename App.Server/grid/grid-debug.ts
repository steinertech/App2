import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { debugLoad, debugLoadByIds, debugUpdate, debugInsert, debugDelete, debugPropertyLoad, debugPropertyLoadByIds, debugPropertyUpdate, debugPropertyInsert } from '../util/util-debug.js';
import { DebugDto, DebugPropertyDto } from '../dto/debug-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumnChooserLoad, gridColumnChooserOk, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridIsCommand, gridLookupSet, gridPatchDeleteMulti, gridSelectedMultiRowKeys, gridTables } from '../util/util-grid.js';

const DEBUG_COLUMNS: GridConfigDto = {
  columns: (['name', 'text'] as const satisfies readonly (keyof DebugDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

const DEBUG_PROPERTY_COLUMNS: GridConfigDto = {
  columns: (['name', 'ownerName', 'ownerType', 'propertyName', 'propertyValue'] as const satisfies readonly (keyof DebugPropertyDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "debug" plane: the debug grid (GridPlaneDto.grids[0]) and the debug property grid (grids[1]). */
export async function planeDebugLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = await gridDebugLoad(request, gridPlaneDto.grids?.[0] ?? {});
  const propertyGridDto = await gridDebugPropertyLoad(request, gridPlaneDto.grids?.[1] ?? {});
  return { ...gridPlaneDto, grids: [gridDto, propertyGridDto] };
}

async function gridDebugLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  // Column Chooser Ok: apply the chosen columns (GridStateDto.columnNames) before the rows are built.
  gridColumnChooserOk(gridDto, DEBUG_COLUMNS.columns ?? []);

  // Selection is by rowIndex: remember it by rowKey so it can be mapped onto the reloaded rows (deleted rows drop out).
  const selectedMultiRowKeys = new Set(gridSelectedMultiRowKeys(gridDto));

  // Delete confirmation (opened by a row's Delete button or the toolbar's DeleteMulti button below) lives at gridDto.planes[1].grids[0] (planes[0] is the lookup), carrying GridStateDto.custom.rowKeys.
  const confirmGridDto = gridDto.planes?.[1]?.grids?.[0];
  if (confirmGridDto !== undefined) {
    // Its Cancel button (GridCustomEnum.Cancel) closes the dialog in App.Web without a server call.
    if (gridIsCommand(confirmGridDto, 'Yes')) {
      const rowKeys = confirmGridDto.state?.custom?.rowKeys;
      if (Array.isArray(rowKeys)) {
        await debugDelete(request, rowKeys.filter((rowKey): rowKey is string => typeof rowKey === 'string'));
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
    await gridDebugSaveUpdate(request, gridDto);
    await gridDebugSaveInsert(request, gridDto);
  }

  const allDebugs = await debugLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DEBUG_COLUMNS.columns ?? [], allDebugs);

  // Filter-Sort-Page: debugs holds only the rows of the current page.
  const { rows: debugs, state: fspState } = gridFsp(allDebugs, DEBUG_COLUMNS.columns ?? [], gridDto.state);
  const columns = gridColumns(DEBUG_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: [
      ...columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort, column.text)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = debugs.map((debug, rowIndex) => ({
    cells: [
      ...columns.map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: gridCellText(debug[column.columnName as keyof DebugDto], column),
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

  // rowKey is the _id (ObjectId hex), since name is editable and not unique.
  const rowKeys: string[] = debugs.map((debug) => debug._id?.toHexString() ?? '');
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
    title: 'Debug Data',
    tables: gridTables([toolbarRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys, isSelectedMulti },
    setting: { isSelectPatch: true, isSelectColumnPatch: true, isSelectMultiPatch: true },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDebugNew(result, columns);
  }

  // Lookup (planes[0]): Column Chooser (opened by planeDebugPatch, kept open while planes[0].planeName is columnChooser)
  // or Filter Multi (opened by planeDebugPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridColumnChooserLoad(gridDto, DEBUG_COLUMNS.columns ?? []) ?? gridFilterMultiLoad(gridDto, DEBUG_COLUMNS.columns ?? [], allDebugs));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/** Debug property grid: rows can be added (New), edited and saved; no Column Chooser and no Delete. */
async function gridDebugPropertyLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDebugPropertySaveUpdate(request, gridDto);
    await gridDebugPropertySaveInsert(request, gridDto);
  }

  const allProperties = await debugPropertyLoad(request);

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

  // rowKey is the _id (ObjectId hex), since name is editable and not unique.
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

  // Lookup (planes[0]): Filter Multi (opened by planeDebugPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, DEBUG_PROPERTY_COLUMNS.columns ?? [], allProperties));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
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

  await debugPropertyInsert(request, [...propertiesByRowIndex.values()]);
}

/**
 * Patches the "debug" plane's grids (debug grid GridPlaneDto.grids[0], debug property grid grids[1]): GridCommandEnum.ColumnChooser opens the Column Chooser lookup,
 * GridCommandEnum.FilterMulti the Filter Multi lookup (distinct texts of its column), GridCommandEnum.Select of a debug grid cell (GridSettingDto.isSelectPatch, isSelectColumnPatch) changes nothing yet;
 * any other command of the debug grid (MultiClick) enables/disables the DeleteMulti button.
 */
export async function planeDebugPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  const propertyGridDto = gridPlaneDto.grids?.[1] ?? {};
  // Reload of the debug property grid (GridSettingDto.isReloadPatch): no other grid depends on it, so only it is rebuilt.
  if (propertyGridDto.command?.commandEnum === GridCommandEnum.Reload) {
    const grid = await gridDebugPropertyLoad(request, propertyGridDto);
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] }] };
  }
  if (propertyGridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(propertyGridDto, DEBUG_PROPERTY_COLUMNS.columns ?? [], await debugPropertyLoad(request));
    return { ...gridPlaneDto, grids: [{}, { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  if (propertyGridDto.command !== undefined) {
    return { ...gridPlaneDto, grids: [{}, {}] };
  }
  // Select: the debug property grid isn't linked to the selected debug row (yet), so nothing is patched.
  if (gridDto.command?.commandEnum === GridCommandEnum.Select) {
    return { ...gridPlaneDto, grids: [{}, {}] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = gridColumnChooserLoad(gridDto, DEBUG_COLUMNS.columns ?? []);
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_COLUMNS.columns ?? [], await debugLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }, {}] };
  }
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridDto), {}] };
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

/** Returns the "Delete item?" confirmation GridDto (Yes button and client-side GridCustomEnum.Cancel button) carrying rowKeys (ObjectId hex) in GridStateDto.custom. */
function gridDebugDeleteConfirm(rowKeys: unknown): GridDto {
  const count = Array.isArray(rowKeys) ? rowKeys.length : 0;
  const text = count === 1 ? 'Delete item?' : `Delete ${count} items?`;
  const textRow: GridRowDto = {
    cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ customEnum: GridCustomEnum.Label, text }] }],
  };
  const buttonRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { customEnum: GridCustomEnum.Button, text: 'Yes', name: 'Yes' },
          { customEnum: GridCustomEnum.Cancel, text: 'Cancel' },
        ],
      },
    ],
  };
  return { title: 'Confirmation', tables: gridTables([], [textRow, buttonRow]), state: { custom: { rowKeys } } };
}

/** Appends one empty, editable new row (one cell per rendered column) to the data table (GridDto.tables[1]). */
function gridDebugNew(gridDto: GridDto, columns: GridConfigColumnDto[]): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: columns.map(
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
