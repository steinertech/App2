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

/** Loads the "design" plane: the design grid (GridPlaneDto.grids[0]). */
export async function planeDesignLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  return { ...gridPlaneDto, grids: [await gridDesignLoad(request, gridPlaneDto.grids?.[0] ?? {})] };
}

/** Editable data rows (no toolbar, header or find row), each with a Delete button in the third column, and the bottom Bar (New, Save, Reload). */
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

  // Page only: there is no header (sort) or find (filter) row. designs holds only the rows of the current page.
  const { rows: designs, state: fspState } = gridFsp(await designLoad(request), DESIGN_COLUMNS.columns ?? [], { ...gridDto.state, sort: undefined, filters: undefined });

  const rows: GridRowDto[] = designs.map((design, rowIndex) => ({
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
  }));

  // rowKey is DesignDto.name (random UUID, set on insert).
  const rowKeys: string[] = designs.map((design) => design.name ?? '');

  const result: GridDto = {
    ...gridDto,
    title: 'Design',
    tables: gridTables([], rows, [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDesignNew(result);
  }

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return result;
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

  const designsByRowIndex = new Map<number, DesignDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const design = designsByRowIndex.get(modify.rowIndex) ?? { sort: 0, text: '' };
    (design as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    designsByRowIndex.set(modify.rowIndex, design);
  }

  await designInsert(request, [...designsByRowIndex.values()]);
}

/** Appends one empty, editable new row to the data table (GridDto.tables[1]). */
function gridDesignNew(gridDto: GridDto): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: gridColumns(DESIGN_COLUMNS.columns ?? []).map(
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
