import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { debugLoad, debugLoadByIds, debugUpdate, debugInsert, debugDelete } from '../util/util-debug.js';
import { DebugDto } from '../dto/debug-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumnChooserLoad, gridColumnChooserOk, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridIsCommand, gridLookupSet, gridTables } from '../util/util-grid.js';

const DEBUG_COLUMNS: GridConfigDto = {
  columns: (['name', 'text'] as const satisfies readonly (keyof DebugDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "debug" plane: the debug grid (GridPlaneDto.grids[0]). */
export async function planeDebugLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  // Column Chooser Ok: apply the chosen columns (GridStateDto.columnNames) before the rows are built.
  gridColumnChooserOk(gridDto, DEBUG_COLUMNS.columns ?? []);

  // Delete confirmation (opened by a row's Delete button below) lives at gridDto.planes[1].grids[0] (planes[0] is the lookup), carrying GridStateDto.custom.rowKeys.
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
        (column): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: gridCellText(debug[column.columnName as keyof DebugDto], column),
          rowIndex,
          columnName: column.columnName,
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
  const findRow = gridFindRow([...columns.map((column) => column.columnName), undefined]);

  const toolbarRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [{ text: 'Column Chooser', name: 'ColumnChooser', customEnum: GridCustomEnum.ColumnChooser }],
      },
    ],
  };

  const time = new Date().toISOString().slice(11, 19);

  const result: GridDto = {
    ...gridDto,
    title: `Debug Data (${time})`,
    tables: gridTables([toolbarRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDebugNew(result, columns);
  }

  // Lookup (planes[0]): Column Chooser (opened by planeDebugPatch, kept open while planes[0].planeName is columnChooser)
  // or Filter Multi (opened by planeDebugPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridColumnChooserLoad(gridDto, DEBUG_COLUMNS.columns ?? []) ?? gridFilterMultiLoad(gridDto, DEBUG_COLUMNS.columns ?? [], allDebugs));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return { ...gridPlaneDto, grids: [result] };
}

/**
 * Patches the "debug" plane's debug grid (GridPlaneDto.grids[0]): GridCommandEnum.ColumnChooser opens the Column Chooser lookup,
 * GridCommandEnum.FilterMulti the Filter Multi lookup (distinct texts of its column); any other command has no patches.
 */
export async function planeDebugPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = gridColumnChooserLoad(gridDto, DEBUG_COLUMNS.columns ?? []);
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_COLUMNS.columns ?? [], await debugLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
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
