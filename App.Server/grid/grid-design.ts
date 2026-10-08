import { GridCellDto, GridCellEnum, GridCustomDto, GridCustomEnum, GridDto, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { GridConfigColumnDto, GridConfigDto, GridConfigTypeEnum } from '../dto/grid-config-dto.js';
import { DesignDto } from '../dto/design-dto.js';
import { designDeleteByNames, designInsert, designLoad } from '../util/util-design.js';
import { gridCellText, gridColumns, gridIsCommand, gridTables } from '../util/util-grid.js';

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

/** Loads the "design" plane: the design grid (GridPlaneDto.grids[0]). */
export async function planeDesignLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [await gridDesignLoad(request, gridPlaneDto.grids?.[0] ?? {})] };
}

/** Editable data rows (no toolbar, header, find row or bar; no filter or paging), ordered by Sort, each with a Delete button in the third column and a virtual Add button row before the first and after every data row. */
async function gridDesignLoad(request: Request, gridDto: GridDto): Promise<GridDto> {
  // rowKeys are the DesignDto.name values of all rows (no paging), in the order sent in the previous response.
  const rowKeys = gridDto.state?.rowKeys ?? [];

  if (gridIsCommand(gridDto, 'Delete')) {
    const rowIndex = gridDto.command?.rowIndex;
    const name = rowIndex !== undefined ? rowKeys[rowIndex] : undefined;
    if (name !== undefined) {
      await designDeleteByNames(request, [name]);
    }
  }

  // Add button clicked: rowIndex is the data row it follows (-1: the Add row before the first data row). Inserts the new row directly into the db.
  if (gridIsCommand(gridDto, 'Add')) {
    const rowIndex = gridDto.command?.rowIndex;
    if (rowIndex !== undefined) {
      await designInsert(request, [{ sort: designAddSort(await designLoad(request), rowKeys, rowIndex), text: '' }]);
    }
  }

  // Ordered by sort (see designLoad).
  const designs = await designLoad(request);

  const rows: GridRowDto[] = [designAddRow(-1)];
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
  });

  const result: GridDto = {
    ...gridDto,
    title: 'Design',
    tables: gridTables([], rows),
    // rowKey is DesignDto.name (random UUID, set on insert).
    state: { ...gridDto.state, rowKeys: designs.map((design) => design.name ?? '') },
  };

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
}

/**
 * Sort of the row inserted by the Add button after the data row rowIndex (-1: before the first data row): the middle of the previous and next row's sort,
 * previous + 1 if there is no next row, next - 1 if there is no previous row. designs are all rows ordered by sort, rowKeys the grid's rows.
 */
function designAddSort(designs: DesignDto[], rowKeys: string[], rowIndex: number): number {
  let indexPrevious = -1;
  if (rowIndex >= 0) {
    indexPrevious = designs.findIndex((design) => design.name === rowKeys[rowIndex]);
    if (indexPrevious === -1) {
      throw new Error('Row not found, please reload!');
    }
  }
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
