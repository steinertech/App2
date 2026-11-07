import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto, GridStateDto } from '../../dto/shared/grid-dto.js';
import { GridConfigColumnDto, GridConfigDto } from '../../dto/grid-config-dto.js';
import { DbDto } from '../../dto/db/db-dto.js';
import { gridBarRow, gridCellText, gridFindRow, gridHeaderCell, gridRowValue, gridTables } from './util-grid.js';
import { titleCase } from './util-main.js';

// Render of the generic data grid (gridDataLoad of util-grid-data.ts): turns the already loaded, filtered and paged documents into the GridDto tables.
// Every rowKey is the document's _id (ObjectId hex), since name is editable or not sent to App.Web.

/**
 * Returns gridDto rendered with dtos (the rows of the current page) and the rendered columns, by gridRenderLayoutStack if GridStateDto.isLayoutStack is true,
 * otherwise by gridRenderLayoutTable. isLayoutStack is gridDto.state.isLayoutStack (initially config.isLayoutStack), toggled on GridCommandEnum.ButtonLayoutClick.
 * Its state is gridDto.state merged with state (e.g. the one of gridFsp), the rowKeys, the multi selection and isLayoutStack,
 * its setting config.setting merged over { isSelectMultiPatch: true }.
 */
export function gridRender<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  columns: GridConfigColumnDto[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
): GridDto {
  let isLayoutStack = gridDto.state?.isLayoutStack ?? config.isLayoutStack ?? false;
  if (gridDto.command?.commandEnum === GridCommandEnum.ButtonLayoutClick) {
    isLayoutStack = !isLayoutStack;
  }
  const gridDtoLayout: GridDto = { ...gridDto, state: { ...gridDto.state, isLayoutStack } };
  return isLayoutStack
    ? gridRenderLayoutStack(gridDtoLayout, dtos, columns, state, selectedMultiRowKeys, config)
    : gridRenderLayoutTable(gridDtoLayout, dtos, columns, state, selectedMultiRowKeys, config);
}

/**
 * Table layout of gridRender: toolbar (gridRenderToolbarRow), header, find row, one row per document (every column editable, a Delete button) and the
 * bar (New, Save, Reload, pager).
 */
export function gridRenderLayoutTable<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  columns: GridConfigColumnDto[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
): GridDto {
  const headerRow: GridRowDto = {
    cells: [
      ...columns.map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort, column.text)),
      { cellEnum: GridCellEnum.Header, text: 'Command' },
    ],
  };
  const rows: GridRowDto[] = dtos.map((dto, rowIndex) => ({
    cells: [
      ...columns.map(
        (column, columnIndex): GridCellDto => ({
          cellEnum: GridCellEnum.Edit,
          text: gridCellText(gridRowValue(dto, column), column),
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
  const findRow = gridFindRow([...columns.map((column) => column.columnName), undefined]);
  return gridRenderResult(gridDto, dtos, state, selectedMultiRowKeys, config, [headerRow, findRow, ...rows]);
}

/**
 * Stack layout of gridRender: toolbar (gridRenderToolbarRow), then per document one row per column with a label cell (the column's text) and its editable
 * value cell (the first label with the multi select checkbox), followed by a row with its Delete button, and the bar (New, Save, Reload, pager).
 * No header or find row. Every cell carries the document's rowIndex (and its columnName), so a click selects the row and column like in the table layout.
 */
export function gridRenderLayoutStack<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  columns: GridConfigColumnDto[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
): GridDto {
  const rows: GridRowDto[] = dtos.flatMap((dto, rowIndex) => [
    ...columns.map(
      (column, columnIndex): GridRowDto => ({
        cells: [
          {
            cellEnum: GridCellEnum.Label,
            text: column.text ?? titleCase(column.columnName),
            rowIndex,
            columnName: column.columnName,
            isSelectMulti: columnIndex === 0 ? true : undefined,
          },
          {
            cellEnum: GridCellEnum.Edit,
            text: gridCellText(gridRowValue(dto, column), column),
            rowIndex,
            columnName: column.columnName,
          },
        ],
      }),
    ),
    {
      cells: [
        { cellEnum: GridCellEnum.Label, text: 'Command', rowIndex },
        {
          cellEnum: GridCellEnum.Custom,
          customs: [{ text: 'Delete', name: 'Delete', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto],
          rowIndex,
        },
      ],
    },
  ]);
  return gridRenderResult(gridDto, dtos, state, selectedMultiRowKeys, config, rows);
}

/**
 * Toolbar of gridRender: Column Chooser if config.isColumnChooser, multi select Delete (enabled if a row of the page is multi selected), and last the
 * Layout button ("Layout Stack" or "Layout Table" by isLayoutStack) sending GridCommandEnum.ButtonLayoutClick.
 */
function gridRenderToolbarRow(config: GridConfigDto, isSelectedMulti: boolean[], isLayoutStack: boolean): GridRowDto {
  return {
    cells: [
      {
        cellEnum: GridCellEnum.Custom,
        customs: [
          ...(config.isColumnChooser ? [{ text: 'Column Chooser', name: 'ColumnChooser', customEnum: GridCustomEnum.ColumnChooser } satisfies GridCustomDto] : []),
          {
            text: 'Delete',
            name: 'DeleteMulti',
            customEnum: GridCustomEnum.Button,
            isDisabled: !isSelectedMulti.some((isSelected) => isSelected),
          },
          { text: isLayoutStack ? 'Layout Stack' : 'Layout Table', name: 'ButtonLayout', customEnum: GridCustomEnum.ButtonLayout } satisfies GridCustomDto,
        ],
      },
    ],
  };
}

/** Returns gridDto with the toolbar, dataRows and bar as tables, and the state (rowKeys, multi selection) and setting shared by both layouts. */
function gridRenderResult<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
  dataRows: GridRowDto[],
): GridDto {
  const isLayoutStack = gridDto.state?.isLayoutStack ?? false;
  const rowKeys: string[] = dtos.map((dto) => dto._id?.toHexString() ?? '');
  const isSelectedMulti = rowKeys.map((rowKey) => selectedMultiRowKeys.has(rowKey));
  return {
    ...gridDto,
    title: `${config.title} (Render ${new Date().toTimeString().slice(0, 8)})`,
    tables: gridTables([gridRenderToolbarRow(config, isSelectedMulti, isLayoutStack)], dataRows, [gridBarRow()]),
    state: { ...gridDto.state, ...state, rowKeys, isSelectedMulti, isLayoutStack },
    setting: { isSelectMultiPatch: true, ...config.setting },
  };
}
