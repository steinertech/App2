import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { debugContentLoad, debugContentLoadByIds, debugContentUpdate, debugContentInsert, debugContentDelete } from '../util/util-debug-property.js';
import { DebugContentDto } from '../dto/debug-property-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumnChooserLoad, gridColumnChooserOk, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridIsCommand, gridLookupSet, gridPatchDeleteMulti, gridSelectedMultiRowKeys, gridTables } from '../util/util-grid.js';
import { gridDebugDeleteConfirm, gridDebugNew } from './grid-debug.js';

const DEBUG_CONTENT_COLUMNS: GridConfigDto = {
  columns: (['name', 'text'] as const satisfies readonly (keyof DebugContentDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "debugProperty" plane: the debug content grid (GridPlaneDto.grids[0]). */
export async function planeDebugPropertyLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = await gridDebugContentLoad(request, gridPlaneDto.grids?.[0] ?? {});
  return { ...gridPlaneDto, grids: [gridDto] };
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

  // rowKey is the _id (ObjectId hex), since name is editable and not unique.
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
    setting: { isSelectMultiPatch: true },
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

/**
 * Patches the "debugProperty" plane's debug content grid (GridPlaneDto.grids[0]): GridCommandEnum.ColumnChooser opens the Column Chooser lookup,
 * GridCommandEnum.FilterMulti the Filter Multi lookup (distinct texts of its column); any other command (MultiClick) enables/disables the DeleteMulti button.
 */
export async function planeDebugPropertyPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = gridColumnChooserLoad(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? []);
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DEBUG_CONTENT_COLUMNS.columns ?? [], await debugContentLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [await gridPatchDeleteMulti(request, gridDto)] };
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
