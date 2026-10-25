import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { DesignMasterDetailDto } from '../dto/design-master-detail-dto.js';
import { GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { designMasterDetailDelete, designMasterDetailInsert, designMasterDetailLoad, designMasterDetailLoadByIds, designMasterDetailUpdate } from '../util/util-design-master-detail.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridIsCommand, gridLookupSet, gridSelectedMultiRowKeys, gridTables } from '../util/util-grid.js';
import { gridDebugDeleteConfirm } from './grid-debug.js';

// The Design Master Detail grid of the "design" plane (GridPlaneDto.grids[3], see planeDesignLoad/planeDesignPatch in grid-design.ts).

// name is not a column, so it's never sent to App.Web (designMasterDetailInsert/designMasterDetailUpdate set it by designMasterDetailName).
const DESIGN_MASTER_DETAIL_COLUMNS: GridConfigDto = {
  columns: [
    { columnName: 'contentName' satisfies keyof DesignMasterDetailDto, text: 'Content', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'bandNameMaster' satisfies keyof DesignMasterDetailDto, text: 'Master Band', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'fieldNameMaster' satisfies keyof DesignMasterDetailDto, text: 'Master Field', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'bandNameDetail' satisfies keyof DesignMasterDetailDto, text: 'Detail Band', typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'fieldNameDetail' satisfies keyof DesignMasterDetailDto, text: 'Detail Field', typeEnum: GridConfigTypeEnum.Text },
  ],
};

/**
 * Builds the Design Master Detail grid like the design band grid: row Delete and multi select Delete (toolbar DeleteMulti) with the same confirmation dialog
 * (gridDebugDeleteConfirm), and the bar (New, Save, Reload, pager). No other grid depends on it.
 */
export async function gridDesignMasterDetailLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  // Selection is by rowIndex: remember it by rowKey so it can be mapped onto the reloaded rows (deleted rows drop out).
  const selectedMultiRowKeys = new Set(gridSelectedMultiRowKeys(gridDto));

  // Delete confirmation (opened by a row's Delete button or the toolbar's DeleteMulti button below) lives at gridDto.planes[1].grids[0] (planes[0] is the lookup), carrying GridStateDto.custom.rowKeys.
  const confirmGridDto = gridDto.planes?.[1]?.grids?.[0];
  if (confirmGridDto !== undefined) {
    // Its Cancel button (GridCustomEnum.Cancel) closes the dialog in App.Web without a server call.
    if (gridIsCommand(confirmGridDto, 'Yes')) {
      const rowKeys = confirmGridDto.state?.custom?.rowKeys;
      if (Array.isArray(rowKeys)) {
        await designMasterDetailDelete(request, rowKeys.filter((rowKey): rowKey is string => typeof rowKey === 'string'));
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
    await gridDesignMasterDetailSaveUpdate(request, gridDto);
    await gridDesignMasterDetailSaveInsert(request, gridDto);
  }

  const allMasterDetails = await designMasterDetailLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DESIGN_MASTER_DETAIL_COLUMNS.columns ?? [], allMasterDetails);

  // Filter-Sort-Page: masterDetails holds only the rows of the current page.
  const { rows: masterDetails, state: fspState } = gridFsp(allMasterDetails, DESIGN_MASTER_DETAIL_COLUMNS.columns ?? [], gridDto.state);

  const columns = gridColumns(DESIGN_MASTER_DETAIL_COLUMNS.columns ?? []);

  const headerRow: GridRowDto = {
    cells: [...columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)), { cellEnum: GridCellEnum.Header, text: 'Command' }],
  };
  const rows: GridRowDto[] = masterDetails.map((masterDetail, rowIndex) => ({
    cells: [
      ...columns.map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: gridCellText(masterDetail[column.columnName as keyof DesignMasterDetailDto], column),
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

  // rowKey is the _id (ObjectId hex), since name is not sent to App.Web.
  const rowKeys: string[] = masterDetails.map((masterDetail) => masterDetail._id?.toHexString() ?? '');
  const isSelectedMulti = rowKeys.map((rowKey) => selectedMultiRowKeys.has(rowKey));
  const findRow = gridFindRow([...columns.map((column) => column.columnName), undefined]);

  const toolbarRow: GridRowDto = {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
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
    title: 'Design Master Detail',
    tables: gridTables([toolbarRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys, isSelectedMulti },
    setting: { isSelectMultiPatch: true },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDesignMasterDetailNew(result);
  }

  // Lookup (planes[0]): Filter Multi (opened by planeDesignPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, DESIGN_MASTER_DETAIL_COLUMNS.columns ?? [], allMasterDetails));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

async function gridDesignMasterDetailSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const masterDetails = await designMasterDetailLoadByIds(request, ids);

  const columns = gridColumns(DESIGN_MASTER_DETAIL_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const masterDetail = masterDetails.find((masterDetail) => masterDetail._id?.toHexString() === rowKey);
    if (masterDetail) {
      (masterDetail as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await designMasterDetailUpdate(request, masterDetails);
}

async function gridDesignMasterDetailSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(DESIGN_MASTER_DETAIL_COLUMNS.columns ?? []);

  const masterDetailsByRowIndex = new Map<number, DesignMasterDetailDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const masterDetail = masterDetailsByRowIndex.get(modify.rowIndex) ?? {};
    (masterDetail as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    masterDetailsByRowIndex.set(modify.rowIndex, masterDetail);
  }

  await designMasterDetailInsert(request, [...masterDetailsByRowIndex.values()]);
}

/** Returns the Filter Multi lookup plane (distinct texts of its column) of the Design Master Detail grid gridDto, for planeDesignPatch. */
export async function gridDesignMasterDetailFilterMultiLoad(request: Request, gridDto: GridDto): Promise<GridPlaneDto | undefined> {
  return gridFilterMultiLoad(gridDto, DESIGN_MASTER_DETAIL_COLUMNS.columns ?? [], await designMasterDetailLoad(request));
}

/** Appends one empty, editable new row to the data table (GridDto.tables[1]). */
function gridDesignMasterDetailNew(gridDto: GridDto): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: gridColumns(DESIGN_MASTER_DETAIL_COLUMNS.columns ?? []).map(
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
