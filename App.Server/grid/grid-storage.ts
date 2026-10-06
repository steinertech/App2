import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto, gridStatePath } from '../dto/shared/grid-dto.js';
import { storageDelete, storageDownloadUrls, storageFiles, storageNew, storageRename } from '../util/util-storage.js';
import { StorageFileDto } from '../dto/storage-file-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridColumnChooserOk, gridColumns, gridFindRow, gridFsp, gridHeaderCell, gridIsCommand, gridLoadColumnChooser, gridLookupSet, gridSelectedMultiRowKeys, gridTables } from '../util/util-grid.js';

const STORAGE_FILE_COLUMNS: GridConfigDto = {
  columns: [
    { columnName: 'fileNameOnly' satisfies keyof StorageFileDto, text: 'File Name', typeEnum: GridConfigTypeEnum.Text, columnNameSort: 'fileNameOnlySort' satisfies keyof StorageFileDto },
    { columnName: 'size' satisfies keyof StorageFileDto, typeEnum: GridConfigTypeEnum.Number },
    { columnName: 'dateModified' satisfies keyof StorageFileDto, text: 'Date Modified (UTC)', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'isFolder' satisfies keyof StorageFileDto, typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'fileNameOnlySort' satisfies keyof StorageFileDto, typeEnum: GridConfigTypeEnum.Text, isHide: true },
  ],
};
/** Storage columns whose values are rendered read-only (GridCellEnum.Label) instead of as text boxes. */
const STORAGE_FILE_LABEL_COLUMNS = new Set<string | undefined>(['size', 'dateModified', 'isFolder'] satisfies (keyof StorageFileDto)[]);

export async function gridLoadStorage(request: Request, gridDto: GridDto): Promise<GridDto> {
  // Column Chooser Ok: apply the chosen columns (GridStateDto.columnNames) before the rows are built.
  gridColumnChooserOk(gridDto);

  // Selection is by rowIndex: remember it by rowKey so it can be mapped onto the reloaded rows (deleted files or another folder drop out).
  const selectedMultiRowKeys = new Set(gridSelectedMultiRowKeys(gridDto));

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Select') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const fileName = gridDto.state?.rowKeys?.[rowIndex];
      if (fileName !== undefined && fileName.endsWith('/')) {
        // Folder (folder paths end with "/"): navigate into it by appending its name to pathSegments.
        const folderName = fileName.split('/').filter(Boolean).pop();
        if (folderName !== undefined) {
          const pathSegments = [...(gridDto.state?.pathSegments ?? []), { name: folderName, text: folderName }];
          gridDto.state = { ...gridDto.state, pathSegments };
        }
      } else if (fileName !== undefined) {
        // TODO: Implement Select button click for fileName.
        console.log('Storage Select rowKey:', fileName);
      }
    }
  }

  // Dialogs (Delete confirmation or New Folder, opened by the buttons below) live at gridDto.planes[1].grids[0] (planes[0] is null).
  // A New Folder dialog carries GridStateDto.custom.path, a Delete confirmation GridStateDto.custom.rowKeys.
  const confirmGridDto = gridDto.planes?.[1]?.grids?.[0];
  const newFolderPath = confirmGridDto?.state?.custom?.path;
  if (confirmGridDto !== undefined && typeof newFolderPath === 'string') {
    const folderName = (confirmGridDto.customModifies ?? [])
      .find((customModify) => customModify.customName === 'FolderName')
      ?.textModified?.trim();
    // Its Cancel button (GridCustomEnum.Cancel) closes the dialog in App.Web without a server call.
    if (gridIsCommand(confirmGridDto, 'Save')) {
      if (folderName !== undefined && folderName !== '') {
        await storageNew(request, newFolderPath, `${folderName}/`);
      }
      gridDto.planes = undefined;
    } else {
      // Rows aren't sent back by the client: rebuild them (keeping the entered name) so the dialog stays visible across other commands.
      gridDto.planes = [null, { grids: [gridStorageNewFolder(newFolderPath, folderName)] }];
    }
  } else if (confirmGridDto !== undefined) {
    // Its Cancel button (GridCustomEnum.Cancel) closes the dialog in App.Web without a server call.
    if (gridIsCommand(confirmGridDto, 'Yes')) {
      const rowKeys = confirmGridDto.state?.custom?.rowKeys;
      if (Array.isArray(rowKeys)) {
        await gridStorageDelete(request, rowKeys);
      }
      gridDto.planes = undefined;
    } else {
      // Rows aren't sent back by the client: rebuild them so the dialog stays visible across other commands.
      gridDto.planes = [null, { grids: [{ ...gridStorageDeleteConfirm(confirmGridDto.state?.custom?.rowKeys), command: undefined }] }];
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Delete') {
    const rowIndex = gridDto.command.rowIndex;
    const rowKey = rowIndex !== undefined ? gridDto.state?.rowKeys?.[rowIndex] : undefined;
    if (rowKey !== undefined) {
      gridDto.planes = [null, { grids: [gridStorageDeleteConfirm([rowKey])] }];
    }
  }

  if (gridIsCommand(gridDto, 'DeleteMulti') && selectedMultiRowKeys.size > 0) {
    gridDto.planes = [null, { grids: [gridStorageDeleteConfirm([...selectedMultiRowKeys])] }];
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'NewFolder') {
    gridDto.planes = [null, { grids: [gridStorageNewFolder(gridStatePath(gridDto.state))] }];
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Up') {
    const pathSegments = (gridDto.state?.pathSegments ?? []).slice(0, -1);
    gridDto.state = { ...gridDto.state, pathSegments };
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Path') {
    const pathIndex = gridDto.command.pathIndex;
    if (pathIndex !== undefined) {
      // Navigate to the clicked breadcrumb segment by keeping it and every segment before it (pathIndex -1 is Root: keeps none).
      const pathSegments = (gridDto.state?.pathSegments ?? []).slice(0, pathIndex + 1);
      gridDto.state = { ...gridDto.state, pathSegments };
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    // Rename first: its rowIndex values refer to the listing before any new entry is inserted.
    await gridStorageSaveRename(request, gridDto);
    await gridStorageSaveInsert(request, gridDto);
  }

  // Filter-Sort-Page: files holds only the rows of the current page.
  const { rows: files, state: fspState } = gridFsp(await storageFiles(request, gridStatePath(gridDto.state)), STORAGE_FILE_COLUMNS.columns ?? [], gridDto.state);
  const columns = gridColumns(STORAGE_FILE_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: [
      ...columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort, column.text)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const fileRows: GridRowDto[] = files.map((file, rowIndex) => ({
    cells: [
      ...columns.map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: STORAGE_FILE_LABEL_COLUMNS.has(column.columnName) ? GridCellEnum.Label : GridCellEnum.Edit,
          text: gridStorageCellText(file, column.columnName as keyof StorageFileDto),
          rowIndex,
          columnName: column.columnName,
          isSelectMulti: columnIndex === 0 ? true : undefined,
        }),
      ),
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { text: 'Select', name: 'Select', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
          { text: 'Delete', name: 'Delete', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
        ],
        rowIndex,
      },
    ],
  }));

  const rowKeys: string[] = files.map((file) => file.fileName ?? '');
  const isSelectedMulti = rowKeys.map((rowKey) => selectedMultiRowKeys.has(rowKey));
  const findRow = gridFindRow([...columns.map((column) => column.columnName), undefined]);

  // Path breadcrumb and Up button are only shown below the root folder; Upload button is always shown.
  const pathCustoms: GridCustomDto[] =
    (gridDto.state?.pathSegments ?? []).length > 0
      ? [
          { name: 'Path', customEnum: GridCustomEnum.Path },
          { text: 'Up', name: 'Up', customEnum: GridCustomEnum.Button },
        ]
      : [];
  const toolbarRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          ...pathCustoms,
          { text: 'New Folder', name: 'NewFolder', customEnum: GridCustomEnum.Button },
          { text: 'Upload', name: 'Upload', customEnum: GridCustomEnum.ButtonUpload },
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
  const toolbarRow2: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [{ text: 'Column Chooser', name: 'ColumnChooser', customEnum: GridCustomEnum.ColumnChooser }],
      },
    ],
  };

  const result: GridDto = {
    ...gridDto,
    tables: gridTables([toolbarRow, toolbarRow2], [headerRow, findRow, ...fileRows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys, isSelectedMulti },
    setting: { title: 'Storage Data', isSelectReload: true, isSelectMultiPatch: true },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridStorageNew(result, columns);
  }

  // Column chooser lookup (planes[0]) is only shown in the response to the ColumnChooser command; any other command closes it.
  gridLookupSet(result, gridDto.command?.commandEnum === GridCommandEnum.ColumnChooser ? gridLoadColumnChooser(STORAGE_FILE_COLUMNS.columns ?? [], gridDto.state) : undefined);

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/** Returns the text of the cell in column columnName for file. Folders have no size or date: their cells are empty instead of "undefined". */
function gridStorageCellText(file: StorageFileDto, columnName: keyof StorageFileDto): string {
  const value = file[columnName];
  if (value === undefined) {
    return '';
  }
  if (columnName === 'size') {
    return gridFormatSize(value as number);
  }
  if (columnName === 'dateModified') {
    return gridFormatDate(value as string);
  }
  return String(value);
}

/** Formats an ISO 8601 date (UTC) as "YYYY-MM-DD HH:mm", e.g. "2026-10-05T14:30:12.000Z" → "2026-10-05 14:30". */
function gridFormatDate(date: string): string {
  return date.slice(0, 16).replace('T', ' ');
}

/** Formats size (in bytes) as B, KB, MB or GB (1 KB = 1024 B), e.g. 512 → "512 B", 1536 → "1.5 KB". */
function gridFormatSize(size: number): string {
  const units = ['KB', 'MB', 'GB'];
  if (size < 1024) {
    return `${size} B`;
  }
  let value = size;
  let unitIndex = -1;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Creates one entry (in the current path) per new row whose fileNameOnly cell was filled in.
 * A name ending with "/" (e.g. "Docs/") creates a folder, any other name (e.g. "My.txt") an empty file.
 */
async function gridStorageSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const path = gridStatePath(gridDto.state);
  const fileNames = (gridDto.modifies ?? [])
    .filter((modify) => modify.isNew && modify.cellEnum === GridCellEnum.Edit && modify.columnName === 'fileNameOnly')
    .map((modify) => modify.textModified?.trim())
    .filter((fileName): fileName is string => fileName !== undefined && fileName !== '');

  for (const fileName of fileNames) {
    await storageNew(request, path, fileName);
  }
}

/**
 * Renames (in the current path) every existing file or folder whose fileNameOnly cell was changed.
 * The entry is looked up by rowIndex in the server's own listing (filtered, sorted and paged like the grid; not in client supplied rowKeys); a modify whose
 * original text doesn't match that entry (e.g. the listing changed meanwhile) is skipped.
 */
async function gridStorageSaveRename(request: Request, gridDto: GridDto): Promise<void> {
  const path = gridStatePath(gridDto.state);
  const renameModifies = (gridDto.modifies ?? []).filter(
    (modify) => !modify.isNew && modify.cellEnum === GridCellEnum.Edit && modify.columnName === 'fileNameOnly' && modify.rowIndex !== undefined,
  );
  if (renameModifies.length === 0) {
    return;
  }

  const files = gridFsp(await storageFiles(request, path), STORAGE_FILE_COLUMNS.columns ?? [], gridDto.state).rows;
  for (const modify of renameModifies) {
    const file = files[modify.rowIndex as number];
    const fileNameOnlyModified = modify.textModified?.trim();
    if (file?.fileNameOnly === undefined || file.fileNameOnly !== modify.text || !fileNameOnlyModified) {
      continue;
    }
    const fileOrFolderName = file.isFolder ? `${file.fileNameOnly}/` : file.fileNameOnly;
    await storageRename(request, path, fileOrFolderName, fileNameOnlyModified);
  }
}

/** Returns the "Delete item?" confirmation GridDto (Yes button and client-side GridCustomEnum.Cancel button) carrying rowKeys (paths relative to the sector key) in GridStateDto.custom. */
function gridStorageDeleteConfirm(rowKeys: unknown): GridDto {
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
  return { setting: { title: 'Confirmation' }, tables: gridTables([], [textRow, buttonRow]), state: { custom: { rowKeys } } };
}

/** Returns the "New Folder" dialog GridDto (Folder Name label and text box, Save button and client-side GridCustomEnum.Cancel button) carrying path (gridStatePath of the storage grid) in GridStateDto.custom. */
function gridStorageNewFolder(path: string, folderName?: string): GridDto {
  const nameRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { customEnum: GridCustomEnum.Label, text: 'Folder Name' },
          { customEnum: GridCustomEnum.Edit, name: 'FolderName', text: folderName ?? '' },
        ],
      },
    ],
  };
  const buttonRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { customEnum: GridCustomEnum.Button, text: 'Save', name: 'Save' },
          { customEnum: GridCustomEnum.Cancel, text: 'Cancel' },
        ],
      },
    ],
  };
  return { setting: { title: 'New Folder' }, tables: gridTables([], [nameRow, buttonRow]), state: { custom: { path } } };
}

/** Deletes rowKeys (paths relative to the sector key; folders end with "/"). rowKeys come back from the client; storageDelete prepends the caller's sector key. */
async function gridStorageDelete(request: Request, rowKeys: unknown[]): Promise<void> {
  const fileOrFolderNames = rowKeys.map((rowKey) => {
    if (typeof rowKey !== 'string' || rowKey === '' || rowKey.startsWith('/')) {
      throw new Error('Invalid file name!');
    }
    return rowKey;
  });
  await storageDelete(request, '', fileOrFolderNames);
}

/** Appends one empty, editable new row (one cell per rendered column) to the data table (GridDto.tables[1]). */
function gridStorageNew(gridDto: GridDto, columns: GridConfigColumnDto[]): void {
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

/** Adds the "Image Preview" grid (GridPlaneDto.grids[1]) if the selected row of the storage grid (grids[0]) is a .jpg or .png file. */
export async function gridLoadStoragePreview(request: Request, grids: GridDto[]): Promise<GridDto[]> {
  const storageGridDto = grids[0];
  const selected = storageGridDto?.state?.selected;
  const rowKey = selected !== undefined ? storageGridDto?.state?.rowKeys?.[selected] : undefined;
  if (storageGridDto === undefined || rowKey === undefined || !/\.(jpg|png)$/i.test(rowKey)) {
    return grids;
  }

  const [imageUrl] = await storageDownloadUrls(request, [rowKey]);
  const previewGridDto: GridDto = {
    setting: { title: 'Image Preview' },
    tables: gridTables([], [{ cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ customEnum: GridCustomEnum.Image, imageUrl, text: rowKey.split('/').pop() }] }] }]),
  };
  return [storageGridDto, previewGridDto];
}
