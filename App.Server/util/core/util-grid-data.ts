import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomEnum, GridDto, GridRowDto } from '../../dto/shared/grid-dto.js';
import { GridConfigColumnDto, GridConfigDto } from '../../dto/grid-config-dto.js';
import { DbDto } from '../../dto/db/db-dto.js';
import { dbDelete, dbInsert, dbLoad, dbLoadByIds, dbUpdate } from './util-db.js';
import {
  gridCellValue, gridColumnChooserLoad, gridColumnChooserOk, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFsp, gridIsCommand, gridLookupSet, gridRowValueSet,
  gridSelectedMultiRowKeys, gridTables,
} from './util-grid.js';
import { gridRender } from './util-grid-render.js';

// Generic data grid of the DbDto documents of one type (like the db functions of util-db.ts: sector by sectorKeyProjectDb, or sectorKeyDb if not isProject).
// Every rowKey is the document's _id (ObjectId hex), since name is editable or not sent to App.Web.

/** Options of gridDataLoad. */
export interface GridDataConfig<T extends DbDto> extends GridConfigDto {
  /** All columns (GridConfigDto.columns); the rendered ones are those of gridColumns. */
  columns: GridConfigColumnDto[];
  /** Writes Save's modified rows (gridDataSaveUpdate) and new rows (gridDataSaveInsert); default dbUpdate and dbInsert. */
  save?: (updates: T[], inserts: T[]) => Promise<void>;
  /** Deletes the confirmed rows by ids (ObjectId hex); default dbDelete. */
  delete?: (ids: string[]) => Promise<void>;
}

/**
 * Builds a data grid of all documents of type, rendered by gridRender (toolbar, header, find row, one row per document of the page, bar). Handles Delete and
 * DeleteMulti (gridDataDelete), Save (gridDataSaveUpdate, gridDataSaveInsert, written by config.save), New (gridDataNew), Column Chooser Ok and Filter Multi
 * Ok; the lookup (planes[0]) is the Column Chooser or Filter Multi kept open.
 */
export async function gridDataLoad<T extends DbDto>(request: Request, type: string, gridDto: GridDto, config: GridDataConfig<T>, isProject = true): Promise<GridDto> {
  const { columns: allColumns, isColumnChooser } = config;

  // Column Chooser Ok: apply the chosen columns (GridStateDto.columnNames) before the rows are built.
  if (isColumnChooser) {
    gridColumnChooserOk(gridDto, allColumns);
  }

  // Selection is by rowIndex: remember it by rowKey so it can be mapped onto the reloaded rows (deleted rows drop out).
  const selectedMultiRowKeys = new Set(gridSelectedMultiRowKeys(gridDto));

  await gridDataDelete(gridDto, config.delete ?? ((ids) => dbDelete(request, type, ids, isProject)));

  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    const updates = await gridDataSaveUpdate<T>(request, type, gridDto, allColumns, isProject);
    const inserts = gridDataSaveInsert<T>(gridDto, allColumns);
    if (config.save !== undefined) {
      await config.save(updates, inserts);
    } else {
      await dbUpdate<T>(request, type, updates, isProject);
      await dbInsert<T>(request, type, inserts, isProject);
    }
  }

  const allDtos = await dbLoad<T>(request, type, isProject);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, allColumns, allDtos);

  // Filter-Sort-Page: dtos holds only the rows of the current page.
  const { rows: dtos, state: fspState } = gridFsp(allDtos, allColumns, gridDto.state);
  const columns = gridColumns(allColumns, isColumnChooser ? gridDto.state : undefined);

  const result = gridRender(gridDto, dtos, columns, fspState, selectedMultiRowKeys, config);

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDataNew(result, columns);
  }

  // Lookup (planes[0]): Column Chooser (opened by the plane's patcher, kept open while planes[0].planeName is columnChooser)
  // or Filter Multi (opened by the plane's patcher, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, (isColumnChooser ? gridColumnChooserLoad(gridDto, allColumns) : undefined) ?? gridFilterMultiLoad(gridDto, allColumns, allDtos));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/**
 * Handles the delete commands of a data grid: the confirmation's Yes deletes its rowKeys (deleteIds) and closes it, a row's Delete or the toolbar's DeleteMulti
 * (with selected rows) opens it (gridDataDeleteConfirm). The confirmation lives at gridDto.planes[1].grids[0] (planes[0] is the lookup), carrying GridStateDto.custom.rowKeys.
 */
export async function gridDataDelete(gridDto: GridDto, deleteIds: (ids: string[]) => Promise<void>): Promise<void> {
  const selectedMultiRowKeys = gridSelectedMultiRowKeys(gridDto);

  const confirmGridDto = gridDto.planes?.[1]?.grids?.[0];
  if (confirmGridDto !== undefined) {
    // Its Cancel button (GridCustomEnum.Cancel) closes the dialog in App.Web without a server call.
    if (gridIsCommand(confirmGridDto, 'Yes')) {
      const rowKeys = confirmGridDto.state?.custom?.rowKeys;
      if (Array.isArray(rowKeys)) {
        await deleteIds(rowKeys.filter((rowKey): rowKey is string => typeof rowKey === 'string'));
      }
      gridDto.planes = undefined;
    } else {
      // Rows aren't sent back by the client: rebuild them so the dialog stays visible across other commands.
      gridDto.planes = [null, { grids: [{ ...gridDataDeleteConfirm(confirmGridDto.state?.custom?.rowKeys), command: undefined }] }];
    }
  }

  if (gridIsCommand(gridDto, 'Delete')) {
    const rowIndex = gridDto.command?.rowIndex;
    const rowKey = rowIndex !== undefined ? gridDto.state?.rowKeys?.[rowIndex] : undefined;
    if (rowKey !== undefined) {
      gridDto.planes = [null, { grids: [gridDataDeleteConfirm([rowKey])] }];
    }
  }

  if (gridIsCommand(gridDto, 'DeleteMulti') && selectedMultiRowKeys.length > 0) {
    gridDto.planes = [null, { grids: [gridDataDeleteConfirm(selectedMultiRowKeys)] }];
  }
}

/**
 * Returns the documents of type modified by gridDto's modifies (not isNew; loaded by their rowKey with dbLoadByIds) with the modified Edit cells
 * of the rendered columns (gridColumns(columns)) set by gridCellValue and gridRowValueSet. Not written.
 */
export async function gridDataSaveUpdate<T extends DbDto>(request: Request, type: string, gridDto: GridDto, columns: GridConfigColumnDto[], isProject = true): Promise<T[]> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const dtos = ids.length > 0 ? await dbLoadByIds<T>(request, type, ids, isProject) : [];

  const renderedColumns = gridColumns(columns);

  for (const modify of modifies) {
    const column = renderedColumns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const dto = dtos.find((dto) => dto._id?.toHexString() === rowKey);
    if (dto) {
      gridRowValueSet(dto, column, gridCellValue(modify.textModified, column));
    }
  }

  return dtos;
}

/** Returns one new document per new row (isNew modifies, by rowIndex; dtoNew its initial value) with its Edit cells of the rendered columns set by gridCellValue and gridRowValueSet. Not written. */
export function gridDataSaveInsert<T extends DbDto>(gridDto: GridDto, columns: GridConfigColumnDto[], dtoNew: () => T = () => ({}) as T): T[] {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const renderedColumns = gridColumns(columns);

  const dtosByRowIndex = new Map<number, T>();

  for (const modify of modifies) {
    const column = renderedColumns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const dto = dtosByRowIndex.get(modify.rowIndex) ?? dtoNew();
    gridRowValueSet(dto, column, gridCellValue(modify.textModified, column));
    dtosByRowIndex.set(modify.rowIndex, dto);
  }

  return [...dtosByRowIndex.values()];
}

/** Returns the "Delete item?" confirmation GridDto (Yes button and client-side GridCustomEnum.Cancel button) carrying rowKeys (ObjectId hex) in GridStateDto.custom. */
export function gridDataDeleteConfirm(rowKeys: unknown): GridDto {
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

/**
 * Appends one empty, editable new row (one cell per rendered column) to the data table (GridDto.tables[1]). A column of newValues (e.g. the master values of a
 * content view detail grid, set by its Save insert) is a label with its value instead.
 */
export function gridDataNew(gridDto: GridDto, columns: GridConfigColumnDto[], newValues?: Record<string, string>): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: columns.map((column): GridCellDto => {
      const newValue = column.columnName !== undefined ? newValues?.[column.columnName] : undefined;
      return newValue !== undefined
        ? { cellEnum: GridCellEnum.Label, text: newValue, columnName: column.columnName, rowIndex, isNew: true }
        : { cellEnum: GridCellEnum.Edit, columnName: column.columnName, placeHolder: 'New', rowIndex, isNew: true };
    }),
  };

  dataTable.rows = [...rows, newRow];
}
