import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridLayoutEnum, GridRowDto, GridStateDto } from '../../dto/shared/grid-dto.js';
import { GridConfigColumnDto, GridConfigDto } from '../../dto/grid-config-dto.js';
import { DbDto } from '../../dto/db/db-dto.js';
import { gridBarRow, gridCellText, gridFindRow, gridHeaderCell, gridRowValue, gridTables } from './util-grid.js';
import { titleCase } from './util-main.js';

// Render of the generic data grid (gridDataLoad of util-grid-data.ts): turns the already loaded, filtered and paged documents into the GridDto tables.
// Every rowKey is the document's _id (ObjectId hex), since name is editable or not sent to App.Web.

/** Order in which GridCommandEnum.ButtonLayoutClick cycles through the layouts. */
const GRID_LAYOUTS: GridLayoutEnum[] = [GridLayoutEnum.Table, GridLayoutEnum.Stack, GridLayoutEnum.Form];

/** Returns layoutEnum, or GridLayoutEnum.Table if it is undefined, None or unknown. */
function gridLayout(layoutEnum: GridLayoutEnum | undefined): GridLayoutEnum {
  return layoutEnum !== undefined && GRID_LAYOUTS.includes(layoutEnum) ? layoutEnum : GridLayoutEnum.Table;
}

/**
 * Returns gridDto rendered with dtos (the rows of the current page) and the rendered columns, by gridRenderLayoutTable, gridRenderLayoutStack or
 * gridRenderLayoutForm according to layoutEnum. layoutEnum is gridDto.state.layoutEnum (initially config.layoutEnum, default Table), switched to the
 * next GRID_LAYOUTS entry on GridCommandEnum.ButtonLayoutClick.
 * Its state is gridDto.state merged with state (e.g. the one of gridFsp), the rowKeys, the multi selection and layoutEnum,
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
  let layoutEnum = gridLayout(gridDto.state?.layoutEnum ?? config.layoutEnum);
  if (gridDto.command?.commandEnum === GridCommandEnum.ButtonLayoutClick) {
    layoutEnum = GRID_LAYOUTS[(GRID_LAYOUTS.indexOf(layoutEnum) + 1) % GRID_LAYOUTS.length];
  }
  const gridDtoLayout: GridDto = { ...gridDto, state: { ...gridDto.state, layoutEnum } };
  switch (layoutEnum) {
    case GridLayoutEnum.Stack:
      return gridRenderLayoutStack(gridDtoLayout, dtos, columns, state, selectedMultiRowKeys, config);
    case GridLayoutEnum.Form:
      return gridRenderLayoutForm(gridDtoLayout, dtos, state, selectedMultiRowKeys, config);
    default:
      return gridRenderLayoutTable(gridDtoLayout, dtos, columns, state, selectedMultiRowKeys, config);
  }
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
 * Stack layout of gridRender: toolbar (gridRenderToolbarRow), then per column one row with its header cell (gridHeaderCell, sort and Filter Multi like in
 * the table layout) left and its Search cell right, then per document one row per column with a label cell (the column's text) and its editable value cell
 * (the first label with the multi select checkbox), followed by a row with its Delete button, and the bar (New, Save, Reload, pager).
 * Every document cell carries the document's rowIndex (and its columnName), so a click selects the row and column like in the table layout.
 */
export function gridRenderLayoutStack<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  columns: GridConfigColumnDto[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
): GridDto {
  const headerRows: GridRowDto[] = columns.map((column) => ({
    cells: [
      gridHeaderCell(column.columnName, gridDto.state?.sort, column.text),
      { cellEnum: GridCellEnum.Search, columnName: column.columnName, placeHolder: 'Search' },
    ],
  }));
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
  return gridRenderResult(gridDto, dtos, state, selectedMultiRowKeys, config, [...headerRows, ...rows]);
}

/** Form layout of gridRender: for now only the toolbar (gridRenderToolbarRow), no data rows and no bar. */
export function gridRenderLayoutForm<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
): GridDto {
  return gridRenderResult(gridDto, dtos, state, selectedMultiRowKeys, config, [], []);
}

/** Toolbar text of the Layout button per GridLayoutEnum. */
const GRID_LAYOUT_TEXTS: Record<GridLayoutEnum, string> = {
  [GridLayoutEnum.None]: 'Layout Table',
  [GridLayoutEnum.Table]: 'Layout Table',
  [GridLayoutEnum.Stack]: 'Layout Stack',
  [GridLayoutEnum.Form]: 'Layout Form',
};

/**
 * Toolbar of gridRender: Column Chooser if config.isColumnChooser, multi select Delete (enabled if a row of the page is multi selected), and last the
 * Layout button ("Layout Table", "Layout Stack" or "Layout Form" by layoutEnum) sending GridCommandEnum.ButtonLayoutClick.
 */
function gridRenderToolbarRow(config: GridConfigDto, isSelectedMulti: boolean[], layoutEnum: GridLayoutEnum): GridRowDto {
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
          { text: GRID_LAYOUT_TEXTS[layoutEnum], name: 'ButtonLayout', customEnum: GridCustomEnum.ButtonLayout } satisfies GridCustomDto,
        ],
      },
    ],
  };
}

/**
 * Returns gridDto with the toolbar, dataRows and barRows (default the gridBarRow) as tables, and the state (rowKeys, multi selection, layoutEnum) and
 * setting shared by all layouts.
 */
function gridRenderResult<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridConfigDto,
  dataRows: GridRowDto[],
  barRows: GridRowDto[] = [gridBarRow()],
): GridDto {
  const layoutEnum = gridLayout(gridDto.state?.layoutEnum);
  const rowKeys: string[] = dtos.map((dto) => dto._id?.toHexString() ?? '');
  const isSelectedMulti = rowKeys.map((rowKey) => selectedMultiRowKeys.has(rowKey));
  return {
    ...gridDto,
    title: `${config.title} (Render ${new Date().toTimeString().slice(0, 8)})`,
    tables: gridTables([gridRenderToolbarRow(config, isSelectedMulti, layoutEnum)], dataRows, barRows),
    state: { ...gridDto.state, ...state, rowKeys, isSelectedMulti, layoutEnum },
    setting: { isSelectMultiPatch: true, ...config.setting },
  };
}
