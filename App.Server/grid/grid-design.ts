import { GridCellDto, GridCellEnum, GridCommandEnum, GridCustomDto, GridCustomEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { GridConfigColumnDto, GridConfigDto, GridConfigTypeEnum } from '../dto/grid-config-dto.js';
import { DesignDto } from '../dto/design-dto.js';
import { designDeleteByNames, designInsert, designLoad, designLoadByNames, designUpdate } from '../util/util-design.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFsp, gridIsCommand, gridTables } from '../util/util-grid.js';

/** Parses a Sort cell text: "" is 0, anything else must be a number. */
function designSortFromText(text: string): number {
  const result = text.trim() === '' ? 0 : Number(text);
  if (!Number.isFinite(result)) {
    throw new Error(`Sort "${text}" is not a number!`);
  }
  return result;
}

const DESIGN_COLUMNS: GridConfigDto = {
  columns: [
    { columnName: 'text' satisfies keyof DesignDto, typeEnum: GridConfigTypeEnum.Text },
    { columnName: 'sort' satisfies keyof DesignDto, typeEnum: GridConfigTypeEnum.Number, valueFromText: designSortFromText },
  ],
};

/** Name of the GridStateDto.custom entry holding the sort of the new row inserted by an Add button; used by Save if its Sort cell is not modified. */
const DESIGN_NEW_SORT = 'designNewSort';

/** Loads the "design" plane: the design grid (GridPlaneDto.grids[0]). */
export async function planeDesignLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [await gridDesignLoad(request, gridPlaneDto.grids?.[0] ?? {})] };
}

/** Editable data rows (no toolbar, header or find row), each with a Delete button in the third column, a virtual Add button row before the first and after every data row, and the bottom Bar (New, Save, Reload). */
async function gridDesignLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDesignSaveUpdate(request, gridDto);
    await gridDesignSaveInsert(request, gridDto);
  }

  if (gridIsCommand(gridDto, 'Delete')) {
    const rowIndex = gridDto.command?.rowIndex;
    const name = rowIndex !== undefined ? gridDto.state?.rowKeys?.[rowIndex] : undefined;
    if (name !== undefined) {
      await designDeleteByNames(request, [name]);
    }
  }

  const designsAll = await designLoad(request);

  // Add button clicked: rowIndex is the data row it follows (-1: the Add row before the first data row). Its sort uses all rows, so the previous/next row may be on another page.
  const addRowIndex = gridIsCommand(gridDto, 'Add') ? gridDto.command?.rowIndex : undefined;
  const addSort = addRowIndex !== undefined ? designAddSort(designsAll, gridDto.state?.rowKeys ?? [], addRowIndex) : undefined;

  // Page only: there is no header (sort) or find (filter) row. designs holds only the rows of the current page.
  const { rows: designs, state: fspState } = gridFsp(designsAll, DESIGN_COLUMNS.columns ?? [], { ...gridDto.state, sort: undefined, filters: undefined });

  // New rows get a rowIndex past the page's data rows.
  const rows: GridRowDto[] = [designAddRow(-1)];
  if (addRowIndex === -1) {
    rows.push(designNewRow(designs.length, addSort));
  }
  designs.forEach((design, rowIndex) => {
    rows.push({
      cells: [
        ...gridColumns(DESIGN_COLUMNS.columns ?? []).map(
          (column: GridConfigColumnDto): GridCellDto => ({
            cellEnum: GridCellEnum.Edit,
            text: gridCellText(design[column.columnName as keyof DesignDto], column),
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
    });
    rows.push(designAddRow(rowIndex));
    if (addRowIndex === rowIndex) {
      rows.push(designNewRow(designs.length, addSort));
    }
  });

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    rows.push(designNewRow(designs.length));
  }

  // rowKey is DesignDto.name (random UUID, set on insert).
  const rowKeys: string[] = designs.map((design) => design.name ?? '');

  // Keep the Add sort only in the response to Add (the next request, e.g. Save, sends it back).
  const { [DESIGN_NEW_SORT]: _, ...custom } = gridDto.state?.custom ?? {};
  if (addSort !== undefined) {
    custom[DESIGN_NEW_SORT] = addSort;
  }

  const result: GridDto = {
    ...gridDto,
    title: 'Design',
    tables: gridTables([], rows, [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys, custom },
  };

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/**
 * Sort of the row inserted by the Add button after the page's data row rowIndex (-1: before its first data row): the middle of the previous and next row's sort,
 * previous + 1 if there is no next row, next - 1 if there is no previous row. designs are all rows (all pages) ordered by sort, rowKeys the page's rows.
 */
function designAddSort(designs: DesignDto[], rowKeys: string[], rowIndex: number): number {
  const indexOf = (rowKey: string | undefined): number => {
    const result = designs.findIndex((design) => design.name === rowKey);
    if (result === -1) {
      throw new Error('Row not found, please reload!');
    }
    return result;
  };

  const indexPrevious = rowIndex >= 0 ? indexOf(rowKeys[rowIndex]) : rowKeys.length > 0 ? indexOf(rowKeys[0]) - 1 : designs.length - 1;
  const previous = designs[indexPrevious];
  const next = designs[indexPrevious + 1];

  if (previous !== undefined && next !== undefined) {
    return (previous.sort + next.sort) / 2;
  }
  if (previous !== undefined) {
    return previous.sort + 1;
  }
  if (next !== undefined) {
    return next.sort - 1;
  }
  return 0;
}

/** Virtual row with only an Add button in the first column. rowIndex is the data row it follows (-1: before the first data row). */
function designAddRow(rowIndex: number): GridRowDto {
  return {
    cells: [{ cellEnum: GridCellEnum.Custom, customs: [{ text: 'Add', name: 'Add', customEnum: GridCustomEnum.Button, rowIndex } satisfies GridCustomDto] }],
  };
}

async function gridDesignSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const names = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const designs = await designLoadByNames(request, names);

  const columns = gridColumns(DESIGN_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const design = designs.find((design) => design.name === rowKey);
    if (design) {
      (design as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await designUpdate(request, designs);
}

async function gridDesignSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(DESIGN_COLUMNS.columns ?? []);

  // Sort of a row inserted by an Add button (see designAddSort); 0 for a row inserted by New.
  const sortNew = gridDto.state?.custom?.[DESIGN_NEW_SORT];

  const designsByRowIndex = new Map<number, DesignDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const design = designsByRowIndex.get(modify.rowIndex) ?? { sort: typeof sortNew === 'number' ? sortNew : 0, text: '' };
    (design as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    designsByRowIndex.set(modify.rowIndex, design);
  }

  await designInsert(request, [...designsByRowIndex.values()]);
}

/** Empty, editable new row. sort (set for an Add button) is shown in its Sort cell; Save uses it (GridStateDto.custom) if that cell is not modified. */
function designNewRow(rowIndex: number, sort?: number): GridRowDto {
  return {
    cells: gridColumns(DESIGN_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        columnName: column.columnName,
        ...(sort !== undefined && column.columnName === ('sort' satisfies keyof DesignDto) ? { text: gridCellText(sort, column) } : {}),
        placeHolder: 'New',
        rowIndex,
        isNew: true,
      }),
    ),
  };
}
