import { GridCellDto, GridCellEnum, GridCustomDto, GridCustomEnum, GridDto, GridRowDto, GridSettingDto, GridStateDto } from '../../dto/shared/grid-dto.js';
import { GridConfigColumnDto } from '../../dto/grid-config-dto.js';
import { DbDto } from '../../dto/db/db-dto.js';
import { gridBarRow, gridCellText, gridFindRow, gridHeaderCell, gridRowValue, gridTables } from './util-grid.js';

// Render of the generic data grid (gridDataLoad of util-grid-data.ts): turns the already loaded, filtered and paged documents into the GridDto tables.
// Every rowKey is the document's _id (ObjectId hex), since name is editable or not sent to App.Web.

/** Options of gridRender. */
export interface GridRenderConfig {
  title: string;
  /** Toolbar Column Chooser button (its lookup opened by the plane's patcher with gridColumnChooserLoad). */
  isColumnChooser?: boolean;
  /** Merged over { isSelectMultiPatch: true }. */
  setting?: GridSettingDto;
}

/**
 * Returns gridDto rendered with dtos (the rows of the current page) and the rendered columns: toolbar (Column Chooser if config.isColumnChooser, multi select
 * Delete, enabled if a row of selectedMultiRowKeys is on the page), header, find row, one row per document (every column editable, a Delete button) and the
 * bar (New, Save, Reload, pager). Its state is gridDto.state merged with state (e.g. the one of gridFsp), the rowKeys and the multi selection.
 */
export function gridRender<T extends DbDto>(
  gridDto: GridDto,
  dtos: T[],
  columns: GridConfigColumnDto[],
  state: GridStateDto,
  selectedMultiRowKeys: Set<string>,
  config: GridRenderConfig,
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

  const rowKeys: string[] = dtos.map((dto) => dto._id?.toHexString() ?? '');
  const isSelectedMulti = rowKeys.map((rowKey) => selectedMultiRowKeys.has(rowKey));
  const findRow = gridFindRow([...columns.map((column) => column.columnName), undefined]);

  const toolbarRow: GridRowDto = {
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
        ],
      },
    ],
  };

  return {
    ...gridDto,
    title: `${config.title} (Render ${new Date().toTimeString().slice(0, 8)})`,
    tables: gridTables([toolbarRow], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...state, rowKeys, isSelectedMulti },
    setting: { isSelectMultiPatch: true, ...config.setting },
  };
}
