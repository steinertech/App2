import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { CONTENT_VIEW_CUSTOM_BAND_NAME, ContentBandDto, ContentBandEnum, contentBandPropertyValue } from '../dto/shared/content-dto.js';
import { DynamicDto } from '../dto/dynamic-dto.js';
import { contentViewBandLoad } from '../util/util-content-view.js';
import { designFormCellPropertyLoadAll, designFormCellPropertyOwner } from '../util/util-design.js';
import { dynamicInsert, dynamicLoad, dynamicLoadByIds, dynamicUpdate } from '../util/util-dynamic.js';
import { indexToColumnNameExcel } from '../util/util-main.js';
import { gridBarRow, gridCellText, gridFsp, gridHeaderCell, gridTables } from '../util/util-grid.js';
import { designFormCount } from './grid-design.js';
import { gridDynamicDataFilterMultiLoad, gridDynamicDataLoad } from './grid-dynamic.js';

/** Returns the band name (DesignBandDto.name) a CONTENT_VIEW_PLANE_NAME grid is built from (GridStateDto.custom), or undefined if missing or empty. */
function gridContentViewBandName(gridDto: GridDto): string | undefined {
  const bandName = gridDto.state?.custom?.[CONTENT_VIEW_CUSTOM_BAND_NAME];
  return typeof bandName === 'string' && bandName !== '' ? bandName : undefined;
}

/** Returns the TableName property of band, or undefined (all rows) if empty. */
function gridContentViewTableName(band: ContentBandDto): string | undefined {
  return contentBandPropertyValue(band, 'TableName') || undefined;
}

/** Returns the LoadSort property of band (Table or Form) as a number; empty, not a whole number or band not found sorts last (Infinity). */
function gridContentViewLoadSort(band: ContentBandDto | undefined): number {
  const text = band !== undefined ? contentBandPropertyValue(band, 'LoadSort') : '';
  const result = Number(text);
  return text !== '' && Number.isInteger(result) ? result : Infinity;
}

/**
 * Loads the CONTENT_VIEW_PLANE_NAME plane (the grids of Content.tsx): every incoming grid is built from the band named by its GridStateDto.custom
 * (see gridContentViewLoad), the bands and their properties read from the database.
 */
export async function planeContentViewLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDtos = gridPlaneDto.grids ?? [];
  const bands = await contentViewBandLoad(request, gridDtos.map(gridContentViewBandName).filter((bandName): bandName is string => bandName !== undefined));

  const gridBands = gridDtos.map((gridDto) => bands.find((band) => band.name === gridContentViewBandName(gridDto)));
  // The grids are built in the order of their band's LoadSort (see gridContentViewLoadSort). With the same LoadSort, a grid's command (e.g. Save of a Form, writing
  // DynamicDto rows) can change the rows of another grid (e.g. a Table of the same TableName), so the grids with a command are built first, otherwise in band order.
  const loadSorts = gridBands.map(gridContentViewLoadSort);
  const gridIndexes = gridDtos.map((_, gridIndex) => gridIndex).sort((a, b) =>
    loadSorts[a] - loadSorts[b] || Number(gridDtos[b].command !== undefined) - Number(gridDtos[a].command !== undefined));
  const grids: GridDto[] = [];
  for (const gridIndex of gridIndexes) {
    grids[gridIndex] = await gridContentViewLoad(request, gridDtos[gridIndex], gridBands[gridIndex]);
  }
  return { ...gridPlaneDto, grids };
}

/** Builds a content view grid from band: a Table as the Data grid of the "dynamic" plane with the rows of its TableName, a Form by gridContentFormLoad; otherwise (or band not found) an empty grid. */
async function gridContentViewLoad(request: Request, gridDto: GridDto, band: ContentBandDto | undefined): Promise<GridDto> {
  if (band?.bandEnum === ContentBandEnum.Table) {
    return gridDynamicDataLoad(request, gridDto, gridContentViewTableName(band));
  }
  if (band?.bandEnum === ContentBandEnum.Form) {
    return gridContentFormLoad(request, gridDto, band);
  }
  // custom is kept, so the grid is still built from its band on a later request.
  return { state: { custom: gridDto.state?.custom } };
}

/** Patches the CONTENT_VIEW_PLANE_NAME plane's grids: GridCommandEnum.FilterMulti of a Table band's grid opens the Filter Multi lookup (distinct texts of its column). */
export async function planeContentViewPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const grids: GridDto[] = [];
  for (const gridDto of gridPlaneDto.grids ?? []) {
    grids.push(await gridContentViewPatch(request, gridDto));
  }
  return { ...gridPlaneDto, grids };
}

async function gridContentViewPatch(request: Request, gridDto: GridDto): Promise<GridDto> {
  const bandName = gridContentViewBandName(gridDto);
  if (gridDto.command?.commandEnum !== GridCommandEnum.FilterMulti || bandName === undefined) {
    return {};
  }
  const [band] = await contentViewBandLoad(request, [bandName]);
  if (band?.bandEnum !== ContentBandEnum.Table) {
    return {};
  }
  const lookupPlane = await gridDynamicDataFilterMultiLoad(request, gridDto, gridContentViewTableName(band));
  return { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] };
}

/**
 * Builds the grid of the Form band band: ColumnCount header columns (named A, B, C, ... by indexToColumnNameExcel) and RowCount rows (each cell the FieldName property
 * of that cell of band, "Cell" if missing or empty), each followed by a row of their values (a text box with the value of that FieldName of the DynamicDto row, the label
 * "Empty" if the cell has no FieldName), repeated for each DynamicDto row of the current page (every cell's rowIndex is that row's index on the page), the counts
 * clamped by designFormCount, followed by the bar (New, Save, Reload and pager). The pager pages the DynamicDto rows of the band's TableName (all rows if empty, like the
 * Data grid of the "dynamic" plane). Like the Debug Data grid (gridDebugNew), New appends one empty form repetition (isNew text boxes, rowIndex after the page's
 * rows), and Save writes the modified text boxes into their DynamicDto rows and inserts the new repetitions as DynamicDto rows with that TableName.
 */
async function gridContentFormLoad(request: Request, gridDto: GridDto, band: ContentBandDto): Promise<GridDto> {
  const rowCount = designFormCount(contentBandPropertyValue(band, 'RowCount'));
  const columnNames = Array.from({ length: designFormCount(contentBandPropertyValue(band, 'ColumnCount')) }, (_, columnIndex) => indexToColumnNameExcel(columnIndex));

  // FieldName of each cell (owner designFormCellPropertyOwner), undefined if missing or empty.
  const cellProperties = band.name !== '' ? await designFormCellPropertyLoadAll(request, band.name) : [];
  const fieldName = (rowIndex: number, columnName: string): string | undefined => {
    const { ownerName } = designFormCellPropertyOwner(band.name, rowIndex, columnName);
    return cellProperties.find((property) => property.ownerName === ownerName && property.propertyName === 'FieldName')?.propertyValue || undefined;
  };
  // Value row cell: a text box with the dynamic row's value of the cell's FieldName ("" if missing), or the label "Empty" if the cell has no FieldName.
  // The text box's columnName is its FieldName (not A, B, ...): a modify is identified by rowIndex and columnName, and A, B, ... repeat for every form row
  // of a repetition. Text boxes with the same FieldName show the same value anyway.
  // A new repetition (dynamic undefined) has empty isNew text boxes, like gridDebugNew.
  const valueCell = (dynamic: Record<string, unknown> | undefined, formRowIndex: number, columnName: string, rowIndex: number): GridCellDto => {
    const name = fieldName(formRowIndex, columnName);
    if (name === undefined) {
      return { cellEnum: GridCellEnum.Label, text: 'Empty', rowIndex, columnName, ...(dynamic === undefined && { isNew: true }) };
    }
    return dynamic !== undefined
      ? { cellEnum: GridCellEnum.Edit, text: gridCellText(dynamic[name], {}), rowIndex, columnName: name }
      : { cellEnum: GridCellEnum.Edit, placeHolder: 'New', rowIndex, columnName: name, isNew: true };
  };

  const tableName = gridContentViewTableName(band);

  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    const fieldNames = new Set(columnNames.flatMap((columnName) => Array.from({ length: rowCount }, (_, formRowIndex) => fieldName(formRowIndex, columnName) ?? []).flat()));
    await gridContentFormSaveUpdate(request, gridDto, fieldNames);
    await gridContentFormSaveInsert(request, gridDto, tableName, fieldNames);
  }

  const dynamics = await dynamicLoad(request, tableName);
  // Filter-Sort-Page: no columns, so no filter or sort. Its selectedRowIndex (the first row of the page if none is selected) is the rowIndex of a form repetition.
  const { rows: pageDynamics, state: fspState } = gridFsp(dynamics, [], gridDto.state);

  // No columnName on the header cells: clicking them doesn't sort and they have no filter button.
  const headerRow: GridRowDto = { cells: columnNames.map((columnName) => gridHeaderCell(undefined, undefined, columnName)) };
  // One form repetition: each form row renders as two rows, its FieldNames ("Cell" if missing), then their values; all its cells get rowIndex
  // (so the whole repetition is selected together).
  const repetitionRows = (dynamic: Record<string, unknown> | undefined, rowIndex: number): GridRowDto[] => Array.from({ length: rowCount }, (_, formRowIndex) => [
    { cells: columnNames.map((columnName): GridCellDto => ({ cellEnum: GridCellEnum.Label, text: fieldName(formRowIndex, columnName) ?? 'Cell', rowIndex, columnName, ...(dynamic === undefined && { isNew: true }) })) },
    { cells: columnNames.map((columnName) => valueCell(dynamic, formRowIndex, columnName, rowIndex)) },
  ]).flat();
  // The form is repeated for each dynamic row of the page (rowIndex its index on the page); New appends one empty repetition with rowIndex after them.
  const rows: GridRowDto[] = [
    ...(pageDynamics as Record<string, unknown>[]).flatMap((dynamic, rowIndex) => repetitionRows(dynamic, rowIndex)),
    ...(gridDto.command?.commandEnum === GridCommandEnum.New ? repetitionRows(undefined, pageDynamics.length) : []),
  ];

  // rowKey is the _id (ObjectId hex) of the form repetition's dynamic row, its rowIndex being the index into rowKeys.
  const rowKeys: string[] = pageDynamics.map((dynamic) => dynamic._id?.toHexString() ?? '');

  // Command (e.g. New or Save of the bar) is transient: not sent back, so it isn't re-processed on a later request. custom (the band name) is kept.
  const isForm = columnNames.length > 0 && rowCount > 0;
  return {
    tables: gridTables([], isForm ? [headerRow, ...rows] : [], [gridBarRow()]),
    state: { ...fspState, selectedRowIndex: isForm ? fspState.selectedRowIndex : undefined, rowKeys, custom: gridDto.state?.custom },
  };
}

/** Saves the modified text boxes of the Content Form into their DynamicDto rows (rowKeys); only those whose columnName is one of fieldNames (the form's FieldNames). */
async function gridContentFormSaveUpdate(request: Request, gridDto: GridDto, fieldNames: Set<string>): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const dynamics = await dynamicLoadByIds(request, ids);

  for (const modify of modifies) {
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || !fieldNames.has(modify.columnName)) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const dynamic = dynamics.find((dynamic) => dynamic._id?.toHexString() === rowKey);
    if (dynamic) {
      (dynamic as Record<string, unknown>)[modify.columnName] = modify.textModified ?? '';
    }
  }

  await dynamicUpdate(request, dynamics);
}

/** Inserts the new form repetitions (isNew modifies, one DynamicDto row per rowIndex) with tableName (none if undefined); only columnNames that are one of fieldNames. */
async function gridContentFormSaveInsert(request: Request, gridDto: GridDto, tableName: string | undefined, fieldNames: Set<string>): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const dynamicsByRowIndex = new Map<number, DynamicDto>();

  for (const modify of modifies) {
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || !fieldNames.has(modify.columnName)) {
      continue;
    }

    const dynamic = dynamicsByRowIndex.get(modify.rowIndex) ?? (tableName !== undefined ? { tableName } : {});
    (dynamic as Record<string, unknown>)[modify.columnName] = modify.textModified ?? '';
    dynamicsByRowIndex.set(modify.rowIndex, dynamic);
  }

  await dynamicInsert(request, [...dynamicsByRowIndex.values()]);
}
