import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPatchDto, GridPlaneDto, gridPlaneGrids, GridRowDto, GridSortDto, gridStatePath } from '../dto/shared/grid-dto.js';
import { sectorKey, titleCase } from './util-main.js';
import { projectsLoad, projectsLoadByNames, projectsUpdate, projectsInsert, projectsDeleteByNames } from './util-project.js';
import { usersLoad, userProject } from './util-user.js';
import { storageDelete, storageFiles, storageNew, storageRename } from './util-storage.js';
import { StorageFileDto } from '../dto/storage-file-dto.js';
import { ProjectDto } from '../dto/project-dto.js';
import { UserDto } from '../dto/user-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';

const STORAGE_FILE_COLUMNS: GridConfigDto = {
  columns: [
    { columnName: 'fileNameOnly' satisfies keyof StorageFileDto, text: 'File Name', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'size' satisfies keyof StorageFileDto, typeEnum: GridConfigTypeEnum.Number },
    { columnName: 'isFolder' satisfies keyof StorageFileDto, typeEnum: GridConfigTypeEnum.Text },
  ],
};
/** Storage columns whose values are rendered read-only (GridCellEnum.Label) instead of as text boxes. */
const STORAGE_FILE_LABEL_COLUMNS = new Set<string | undefined>(['size', 'isFolder'] satisfies (keyof StorageFileDto)[]);
const PROJECT_COLUMNS: GridConfigDto = {
  columns: (['name', 'description'] as const satisfies readonly (keyof ProjectDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};
const USER_COLUMNS: GridConfigDto = {
  columns: (['email', 'sectorKey'] as const satisfies readonly (keyof UserDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

function gridFindRow(columnNames: (string | undefined)[]): GridRowDto {
  return {
    cells: columnNames.map((columnName): GridCellDto =>
      columnName !== undefined
        ? { cellEnum: GridCellEnum.Search, columnName, placeHolder: 'Search' }
        : { cellEnum: GridCellEnum.Empty },
    ),
  };
}

function gridHeaderCell(column: string | undefined, sort?: GridSortDto, text?: string): GridCellDto {
  const cell: GridCellDto = { cellEnum: GridCellEnum.Header, text: text ?? titleCase(column), columnName: column };
  if (sort && sort.columnName === column) {
    cell.isSortAsc = sort.isSortAsc;
  }
  return cell;
}

function gridConfirm(text: string): GridDto {
  const textRow: GridRowDto = {
    cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ customEnum: GridCustomEnum.Label, text }] }],
  };
  const buttonRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { customEnum: GridCustomEnum.Button, text: 'Ok', name: 'Ok' },
          { customEnum: GridCustomEnum.Button, text: 'Cancel', name: 'Cancel' },
          { customEnum: GridCustomEnum.Button, text: 'ConfirmTwo', name: 'ConfirmTwo' },
        ],
      },
    ],
  };
  return { rows: [textRow, buttonRow] };
}

/**
 * Walks gridDto and every GridDto nested under it (via gridPlaneGrids) for the GridPlaneDto whose grids contain a GridDto
 * with the given customName command, and removes that GridPlaneDto from its immediate parent's planes list. Returns true if found and removed.
 */
function gridRemoveCommand(gridDto: GridDto, customName: string): boolean {
  for (const parentGridDto of gridPlaneGrids({ grids: [gridDto] })) {
    const planes = parentGridDto.planes ?? [];
    const planesIndex = planes.findIndex((gridPlane) => (gridPlane.grids ?? []).some((nestedGridDto) => gridIsCommand(nestedGridDto, customName)));
    if (planesIndex !== -1) {
      planes.splice(planesIndex, 1);
      return true;
    }
  }

  return false;
}

/** Walks gridDto and every GridDto nested under it (via gridPlaneGrids) for the first one whose own command matches customName. */
function gridFindCommand(gridDto: GridDto, customName: string): GridDto | undefined {
  return gridPlaneGrids({ grids: [gridDto] }).find((nestedGridDto) => gridIsCommand(nestedGridDto, customName));
}

function gridIsCommand(gridDto: GridDto, customName: string): boolean {
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
function gridIsAnySelectedMulti(gridDto: GridDto): boolean {
  return (gridDto.state?.isSelectedMulti ?? []).some((isSelected) => isSelected === true);
}

async function gridProjectLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridProjectSaveUpdate(request, gridDto);
    await gridProjectSaveInsert(request, gridDto);
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Switch') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const projectName = gridDto.state?.rowKeys?.[rowIndex];
      if (projectName !== undefined) {
        await userProject(request, projectName);
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Delete') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const projectName = gridDto.state?.rowKeys?.[rowIndex];
      if (projectName !== undefined) {
        await projectsDeleteByNames(request, [projectName]);
        // Selection is by rowIndex, which no longer matches the remaining rows.
        gridDto.state = { ...gridDto.state, isSelectedMulti: [] };
      }
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'DeleteMulti') {
    const rowKeys = gridDto.state?.rowKeys ?? [];
    const projectNames = (gridDto.state?.isSelectedMulti ?? [])
      .map((isSelected, rowIndex) => (isSelected ? rowKeys[rowIndex] : undefined))
      .filter((projectName): projectName is string => projectName !== undefined);
    if (projectNames.length > 0) {
      await projectsDeleteByNames(request, projectNames);
    }
    // Selection is by rowIndex, which no longer matches the remaining rows.
    gridDto.state = { ...gridDto.state, isSelectedMulti: [] };
  }

  const projects = await projectsLoad(request);

  const headerRow: GridRowDto = {
    cells: [
      ...(PROJECT_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = projects.map((project, rowIndex) => ({
    cells: [
      ...(PROJECT_COLUMNS.columns ?? []).map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: project[column.columnName as keyof ProjectDto] as string | undefined,
          rowIndex,
          columnName: column.columnName,
          isSelectMulti: columnIndex === 0 ? true : undefined,
        }),
      ),
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          { text: 'Switch', name: 'Switch', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
          { text: 'Delete', name: 'Delete', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
          { text: 'Confirm', name: 'Confirm', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto,
        ],
        rowIndex,
      },
    ],
  }));

  const rowKeys: string[] = projects.map((project) => project.name ?? '');
  const findRow = gridFindRow([...(PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName), undefined]);

  const deleteMultiRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          {
            text: 'Delete',
            name: 'DeleteMulti',
            customEnum: GridCustomEnum.Button,
            isDisabled: !gridIsAnySelectedMulti(gridDto),
          } satisfies GridCustomDto,
        ],
      },
    ],
  };

  const time = new Date().toISOString().slice(11, 19);

  const result: GridDto = {
    ...gridDto,
    text: `Project Data (${time})`,
    rows: [deleteMultiRow, headerRow, findRow, ...rows],
    state: { ...gridDto.state, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    await gridProjectNew(request, result);
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Confirm') {
    result.planes = [{ grids: [gridConfirm('Are you sure?')] }];
  }

  if (gridRemoveCommand(gridDto, 'Cancel')) {
    result.text = 'Hello World (Cancel)';
  }

  const confirmTwoGridDto = gridFindCommand(gridDto, 'ConfirmTwo');
  if (confirmTwoGridDto !== undefined) {
    confirmTwoGridDto.planes = [{ grids: [gridConfirm('Are you sure?')] }];
    confirmTwoGridDto.command = undefined;
  }

  // Command is transient: clear it so it isn't re-processed on a later request that only carries a nested dialog override.
  result.command = undefined;

  return result;
}

/** Enables the DeleteMulti button if one or more rows are selected. */
async function gridPatchDeleteMulti(request: Request, gridDto: GridDto): Promise<GridDto> {
  return { patches: [{ name: 'DeleteMulti', isDisabled: !gridIsAnySelectedMulti(gridDto) } satisfies GridPatchDto] };
}

async function gridProjectSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = gridDto.modifies ?? [];
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const names = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const projects = await projectsLoadByNames(request, names);

  const columnNames = new Set((PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName));

  for (const modify of modifies) {
    if (
      modify.rowIndex === undefined ||
      modify.columnName === undefined ||
      modify.cellEnum !== GridCellEnum.Edit ||
      !columnNames.has(modify.columnName)
    ) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const project = projects.find((project) => project.name === rowKey);
    if (project) {
      (project as Record<string, string | undefined>)[modify.columnName] = modify.textModified;
    }
  }

  await projectsUpdate(request, projects);
}

async function gridProjectSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columnNames = new Set((PROJECT_COLUMNS.columns ?? []).map((column) => column.columnName));

  const projectsByRowIndex = new Map<number, ProjectDto>();

  for (const modify of modifies) {
    if (
      modify.rowIndex === undefined ||
      modify.columnName === undefined ||
      modify.cellEnum !== GridCellEnum.Edit ||
      !columnNames.has(modify.columnName)
    ) {
      continue;
    }

    const project = projectsByRowIndex.get(modify.rowIndex) ?? {};
    (project as Record<string, string | undefined>)[modify.columnName] = modify.textModified;
    projectsByRowIndex.set(modify.rowIndex, project);
  }

  await projectsInsert(request, [...projectsByRowIndex.values()]);
}

async function gridProjectNew(request: Request, gridDto: GridDto): Promise<void> {
  const rows = gridDto.rows ?? [];

  const newRows: GridRowDto[] = [0, 1].map((rowOffset) => {
    const rowIndex = rows.length + rowOffset;
    return {
      cells: (PROJECT_COLUMNS.columns ?? []).map(
        (column): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          columnName: column.columnName,
          placeHolder: 'New',
          rowIndex,
          isNew: true,
        }),
      ),
    };
  });

  gridDto.rows = [...rows, ...newRows];
}

async function gridLoadUser(request: Request, gridDto: GridDto): Promise<GridDto> {
  const users = await usersLoad(request);

  const headerRow: GridRowDto = {
    cells: (USER_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = users.map((user, rowIndex) => ({
    cells: (USER_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: user[column.columnName as keyof UserDto] as string | undefined,
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));
  const findRow = gridFindRow([...(USER_COLUMNS.columns ?? []).map((column) => column.columnName)]);

  return { ...gridDto, text: 'User Data', rows: [headerRow, findRow, ...rows] };
}

/** Returns the GridStateDto.rowKeys of the rows whose GridStateDto.isSelectedMulti entry is true. */
function gridSelectedMultiRowKeys(gridDto: GridDto): string[] {
  const rowKeys = gridDto.state?.rowKeys ?? [];
  return (gridDto.state?.isSelectedMulti ?? [])
    .map((isSelected, rowIndex) => (isSelected ? rowKeys[rowIndex] : undefined))
    .filter((rowKey): rowKey is string => rowKey !== undefined);
}

async function gridLoadStorage(request: Request, gridDto: GridDto): Promise<GridDto> {
  // Selection is by rowIndex: remember it by rowKey so it can be mapped onto the reloaded rows (deleted files or another folder drop out).
  const selectedMultiRowKeys = new Set(gridSelectedMultiRowKeys(gridDto));

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Select') {
    const rowIndex = gridDto.command.rowIndex;
    if (rowIndex !== undefined) {
      const fileName = gridDto.state?.rowKeys?.[rowIndex];
      if (fileName !== undefined && fileName.endsWith('/')) {
        // Folder (blob folder paths end with "/"): navigate into it by appending its name to pathSegments.
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

  // Dialogs (Delete confirmation or New Folder, opened by the buttons below) live at gridDto.planes[0].grids[0].
  // A New Folder dialog carries GridStateDto.custom.path, a Delete confirmation GridStateDto.custom.rowKeys.
  const confirmGridDto = gridDto.planes?.[0]?.grids?.[0];
  const newFolderPath = confirmGridDto?.state?.custom?.path;
  if (confirmGridDto !== undefined && typeof newFolderPath === 'string') {
    const folderName = (confirmGridDto.customModifies ?? [])
      .find((customModify) => customModify.customName === 'FolderName')
      ?.textModified?.trim();
    if (gridIsCommand(confirmGridDto, 'Yes') && folderName !== undefined && folderName !== '') {
      await storageNew(request, `${newFolderPath}${folderName}/`);
    }
    if (gridIsCommand(confirmGridDto, 'Yes') || gridIsCommand(confirmGridDto, 'Cancel')) {
      gridDto.planes = undefined;
    } else {
      // Rows aren't sent back by the client: rebuild them (keeping the entered name) so the dialog stays visible across other commands.
      gridDto.planes = [{ grids: [gridStorageNewFolder(newFolderPath, folderName)] }];
    }
  } else if (confirmGridDto !== undefined) {
    if (gridIsCommand(confirmGridDto, 'Yes')) {
      const rowKeys = confirmGridDto.state?.custom?.rowKeys;
      if (Array.isArray(rowKeys)) {
        await gridStorageDelete(request, rowKeys);
      }
    }
    if (gridIsCommand(confirmGridDto, 'Yes') || gridIsCommand(confirmGridDto, 'Cancel')) {
      gridDto.planes = undefined;
    } else {
      // Rows aren't sent back by the client: rebuild them so the dialog stays visible across other commands.
      gridDto.planes = [{ grids: [{ ...gridStorageDeleteConfirm(confirmGridDto.state?.custom?.rowKeys), command: undefined }] }];
    }
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'Delete') {
    const rowIndex = gridDto.command.rowIndex;
    const rowKey = rowIndex !== undefined ? gridDto.state?.rowKeys?.[rowIndex] : undefined;
    if (rowKey !== undefined) {
      gridDto.planes = [{ grids: [gridStorageDeleteConfirm([rowKey])] }];
    }
  }

  if (gridIsCommand(gridDto, 'DeleteMulti') && selectedMultiRowKeys.size > 0) {
    gridDto.planes = [{ grids: [gridStorageDeleteConfirm([...selectedMultiRowKeys])] }];
  }

  if (gridDto.command?.commandEnum === GridCommandEnum.CustomButtonClick && gridDto.command.customName === 'NewFolder') {
    gridDto.planes = [{ grids: [gridStorageNewFolder(gridStatePath(gridDto.state))] }];
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

  const files = await storageFiles(request, gridStatePath(gridDto.state));

  const headerRow: GridRowDto = {
    cells: [
      ...(STORAGE_FILE_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort, column.text)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const fileRows: GridRowDto[] = files.map((file, rowIndex) => ({
    cells: [
      ...(STORAGE_FILE_COLUMNS.columns ?? []).map(
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
  const findRow = gridFindRow([...(STORAGE_FILE_COLUMNS.columns ?? []).map((column) => column.columnName), undefined]);

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

  const result: GridDto = {
    ...gridDto,
    text: 'Storage Data',
    rows: [toolbarRow, headerRow, findRow, ...fileRows],
    state: { ...gridDto.state, rowKeys, isSelectedMulti },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridStorageNew(result);
  }

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/** Returns the text of the cell in column columnName for file. Folders have no size: their Size cell is empty instead of "undefined". */
function gridStorageCellText(file: StorageFileDto, columnName: keyof StorageFileDto): string {
  const value = file[columnName];
  if (value === undefined) {
    return '';
  }
  return columnName === 'size' ? gridFormatSize(value as number) : String(value);
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
    await storageNew(request, `${path}${fileName}`);
  }
}

/**
 * Renames (in the current path) every existing file or folder whose fileNameOnly cell was changed.
 * The entry is looked up by rowIndex in the server's own listing (not in client supplied rowKeys); a modify whose
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

  const files = await storageFiles(request, path);
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

/** Returns the "Delete item?" confirmation GridDto (Yes and Cancel buttons) carrying rowKeys (full blob pathnames) in GridStateDto.custom. */
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
          { customEnum: GridCustomEnum.Button, text: 'Cancel', name: 'Cancel' },
        ],
      },
    ],
  };
  return { text: 'Confirmation', rows: [textRow, buttonRow], state: { custom: { rowKeys } } };
}

/** Returns the "New Folder" dialog GridDto (Folder Name label and text box, Yes and Cancel buttons) carrying path (gridStatePath of the storage grid) in GridStateDto.custom. */
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
          { customEnum: GridCustomEnum.Button, text: 'Yes', name: 'Yes' },
          { customEnum: GridCustomEnum.Button, text: 'Cancel', name: 'Cancel' },
        ],
      },
    ],
  };
  return { text: 'New Folder', rows: [nameRow, buttonRow], state: { custom: { path } } };
}

/** Deletes rowKeys (full blob pathnames; folders end with "/"). rowKeys come back from the client, so each must lie below the caller's sector key. */
async function gridStorageDelete(request: Request, rowKeys: unknown[]): Promise<void> {
  const prefix = await sectorKey(request, true);
  const fileOrFolderNames = rowKeys.map((rowKey) => {
    if (typeof rowKey !== 'string' || !rowKey.startsWith(prefix) || rowKey === prefix) {
      throw new Error('Invalid file name!');
    }
    return rowKey.slice(prefix.length);
  });
  await storageDelete(request, '', fileOrFolderNames);
}

/** Appends one empty, editable new row to gridDto. */
function gridStorageNew(gridDto: GridDto): void {
  const rows = gridDto.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: (STORAGE_FILE_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        columnName: column.columnName,
        placeHolder: 'New',
        rowIndex,
        isNew: true,
      }),
    ),
  };

  gridDto.rows = [...rows, newRow];
}

type GridLoader = (request: Request, gridDto: GridDto) => Promise<GridDto>;

const PLANE_GRID_LOADERS: Record<string, GridLoader[]> = {
  debug: [gridProjectLoad],
  project: [gridProjectLoad, gridLoadUser],
  storage: [gridLoadStorage],
};

export async function gridPlaneLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const loaders = gridPlaneDto.planeName !== undefined ? (PLANE_GRID_LOADERS[gridPlaneDto.planeName] ?? []) : [];
  const incomingGrids = gridPlaneDto.grids ?? [];

  const grids = await Promise.all(
    loaders.map((loader, gridIndex): Promise<GridDto> => {
      const gridDto: GridDto = incomingGrids[gridIndex] ?? {};
      gridCommandSortClick(gridDto);
      return loader(request, gridDto);
    }),
  );

  return { grids };
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
