import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { designBandInsert, designBandLoad, designBandLoadByIds, designBandUpdate } from '../util/util-design.js';
import { DesignBandDto, DesignBandEnum } from '../dto/design-dto.js';
import { GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridTables } from '../util/util-grid.js';

/** The names of DesignBandEnum, e.g. "Header". */
const DESIGN_BAND_ENUM_NAMES = Object.keys(DesignBandEnum).filter((key) => isNaN(Number(key)));

/** Parses a DesignBandEnum name (case-insensitive, e.g. "header") or number (e.g. "1"). "" is DesignBandEnum.None. */
function designBandEnumFromText(text: string): DesignBandEnum {
  const value = text.trim();
  if (value === '') {
    return DesignBandEnum.None;
  }
  const name = DESIGN_BAND_ENUM_NAMES.find((name) => name.toLowerCase() === value.toLowerCase());
  const result = name !== undefined ? DesignBandEnum[name as keyof typeof DesignBandEnum] : Number(value);
  if (!Number.isInteger(result) || DesignBandEnum[result] === undefined) {
    throw new Error(`Band "${text}" is not one of: ${DESIGN_BAND_ENUM_NAMES.join(', ')}!`);
  }
  return result;
}

/** Parses a whole number. "" is 0. */
function designSortFromText(text: string): number {
  const value = text.trim();
  if (value === '') {
    return 0;
  }
  const result = Number(value);
  if (!Number.isInteger(result)) {
    throw new Error(`Sort "${text}" is not a whole number!`);
  }
  return result;
}

// name is not a column, so it's never sent to App.Web (designBandInsert sets it to a random UUID).
const DESIGN_BAND_COLUMNS: GridConfigDto = {
  columns: [
    {
      columnName: 'bandEnum' satisfies keyof DesignBandDto,
      text: 'Band',
      typeEnum: GridConfigTypeEnum.Number,
      valueToText: (value) => DesignBandEnum[value as DesignBandEnum] ?? String(value),
      valueFromText: designBandEnumFromText,
    },
    { columnName: 'sort' satisfies keyof DesignBandDto, typeEnum: GridConfigTypeEnum.Number, valueFromText: designSortFromText },
  ],
};

/** Loads the "design" plane: the design band grid (GridPlaneDto.grids[0]). */
export async function planeDesignLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridDesignBandSaveUpdate(request, gridDto);
    await gridDesignBandSaveInsert(request, gridDto);
  }

  const allBands = await designBandLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, DESIGN_BAND_COLUMNS.columns ?? [], allBands);

  // Filter-Sort-Page: bands holds only the rows of the current page.
  const { rows: bands, state: fspState } = gridFsp(allBands, DESIGN_BAND_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(DESIGN_BAND_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = bands.map((band, rowIndex) => ({
    cells: gridColumns(DESIGN_BAND_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText(band[column.columnName as keyof DesignBandDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex), since name is not sent to App.Web.
  const rowKeys: string[] = bands.map((band) => band._id?.toHexString() ?? '');
  const findRow = gridFindRow(gridColumns(DESIGN_BAND_COLUMNS.columns ?? []).map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: 'Design Band',
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridDesignBandNew(result);
  }

  // Lookup (planes[0]): Filter Multi (opened by planeDesignPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, DESIGN_BAND_COLUMNS.columns ?? [], allBands));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return { ...gridPlaneDto, grids: [result] };
}

/** Patches the "design" plane's design band grid (GridPlaneDto.grids[0]): GridCommandEnum.FilterMulti opens the Filter Multi lookup (distinct texts of its column). */
export async function planeDesignPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, DESIGN_BAND_COLUMNS.columns ?? [], await designBandLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [{}] };
}

async function gridDesignBandSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const bands = await designBandLoadByIds(request, ids);

  const columns = gridColumns(DESIGN_BAND_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const band = bands.find((band) => band._id?.toHexString() === rowKey);
    if (band) {
      (band as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await designBandUpdate(request, bands);
}

async function gridDesignBandSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(DESIGN_BAND_COLUMNS.columns ?? []);

  const bandsByRowIndex = new Map<number, DesignBandDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const band = bandsByRowIndex.get(modify.rowIndex) ?? {};
    (band as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    bandsByRowIndex.set(modify.rowIndex, band);
  }

  await designBandInsert(request, [...bandsByRowIndex.values()]);
}

/** Appends one empty, editable new row to the data table (GridDto.tables[1]). */
function gridDesignBandNew(gridDto: GridDto): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: gridColumns(DESIGN_BAND_COLUMNS.columns ?? []).map(
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
