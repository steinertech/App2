import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { CONTENT_VIEW_CUSTOM_BAND_NAME, ContentBandDto, ContentBandEnum, contentBandPropertyValue } from '../dto/shared/content-dto.js';
import { DynamicDto } from '../dto/db/dynamic-dto.js';
import { contentViewBandLoad } from '../util/db/util-content-view.js';
import { designFormCellPropertyLoadAll, designFormCellPropertyOwner } from '../util/db/util-design.js';
import { DesignMasterDetailDto } from '../dto/db/design-master-detail-dto.js';
import { designMasterDetailBands, designMasterDetailLoad } from '../util/db/util-design-master-detail.js';
import { dynamicInsert, dynamicLoad, dynamicLoadByIds, dynamicUpdate } from '../util/db/util-dynamic.js';
import { indexToColumnNameExcel } from '../util/core/util-main.js';
import { gridBarRow, gridCellText, gridFsp, gridHeaderCell, gridTables } from '../util/core/util-grid.js';
import { gridDataSaveInsert, gridDataSaveUpdate } from '../util/core/util-grid-data.js';
import { designFormCount } from './plane-design.js';
import { gridDynamicDataColumn, gridDynamicDataColumnChooserLoad, gridDynamicDataFilterMultiLoad, gridDynamicDataLoad } from './plane-dynamic.js';

/** Returns the band name (DesignBandDto.name) a CONTENT_VIEW_PLANE_NAME grid is built from (GridStateDto.custom), or undefined if missing or empty. */
function gridContentViewBandName(gridDto: GridDto): string | undefined {
  const bandName = gridDto.state?.custom?.[CONTENT_VIEW_CUSTOM_BAND_NAME];
  return typeof bandName === 'string' && bandName !== '' ? bandName : undefined;
}

/** Returns the TableName property of band, or undefined (all rows) if empty. */
function gridContentViewTableName(band: ContentBandDto): string | undefined {
  return contentBandPropertyValue(band, 'TableName') || undefined;
}

/** Returns whether the IsDistinct property of a Table band is "true" (saved as "true" or "false" by the Design Band Properties grid). */
function gridContentViewIsDistinct(band: ContentBandDto): boolean {
  return contentBandPropertyValue(band, 'IsDistinct') === 'true';
}

/** Returns the Title property of band (Table or Form), its TableName property if empty, or undefined (no title) if both are empty. */
function gridContentViewTitle(band: ContentBandDto): string | undefined {
  return contentBandPropertyValue(band, 'Title') || gridContentViewTableName(band);
}

/**
 * Returns the order (grid indexes) to build the grids of gridDtos (with their bands gridBands) in: the grid with a command first, since it can change the rows of another
 * grid (e.g. Save of a Form writing DynamicDto rows a Table of the same TableName shows); then every master grid (see gridContentViewDetail) before its detail grids, so
 * they read its reloaded selection; otherwise in band order. A grid in a cycle of Design Master Details (rejected on Save, but e.g. left by a band rename) whose masters
 * can't all be built first is built in band order, reading the selection App.Web sent for its masters not built yet (as does the grid with the command).
 */
function gridContentViewBuildOrder(gridDtos: GridDto[], gridBands: (ContentBandDto | undefined)[], masterDetails: DesignMasterDetailDto[]): number[] {
  // Per grid: the indexes of its master grids (a band that is its own master doesn't wait for itself).
  const masterIndexes = gridBands.map((band, gridIndex) => masterDetails
    .map(designMasterDetailBands)
    .filter((bands) => band !== undefined && bands?.detailBandName === band.name)
    .map((bands) => gridBands.findIndex((masterBand) => masterBand?.name === bands?.masterBandName))
    .filter((masterIndex) => masterIndex !== -1 && masterIndex !== gridIndex));
  const commandIndex = gridDtos.findIndex((gridDto) => gridDto.command !== undefined);
  const result: number[] = commandIndex !== -1 ? [commandIndex] : [];
  while (result.length < gridDtos.length) {
    const remaining = [...gridDtos.keys()].filter((gridIndex) => !result.includes(gridIndex));
    result.push(remaining.find((gridIndex) => masterIndexes[gridIndex].every((masterIndex) => result.includes(masterIndex))) ?? remaining[0]);
  }
  return result;
}

/**
 * Loads the CONTENT_VIEW_PLANE_NAME plane (the grids of Content.tsx): every incoming grid is built from the band named by its GridStateDto.custom
 * (see gridContentViewLoad), the bands and their properties read from the database, in the order of gridContentViewBuildOrder.
 */
export async function planeContentViewLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDtos = gridPlaneDto.grids ?? [];
  const gridBands = await gridContentViewBandsLoad(request, gridDtos);
  const masterDetails = await designMasterDetailLoad(request);
  const masterBandNames = gridContentViewMasterBandNames(masterDetails);
  const grids: GridDto[] = [];
  for (const gridIndex of gridContentViewBuildOrder(gridDtos, gridBands, masterDetails)) {
    const band = gridBands[gridIndex];
    // A master grid already built gives its reloaded selection, otherwise (see gridContentViewBuildOrder) the selection sent by App.Web.
    const detail = band !== undefined
      ? await gridContentViewDetail(request, masterDetails, band, gridDtos.map((gridDto, index) => grids[index] ?? gridDto), gridBands)
      : undefined;
    grids[gridIndex] = await gridContentViewLoad(request, gridDtos[gridIndex], band, band !== undefined && masterBandNames.has(band.name), detail);
  }
  return { ...gridPlaneDto, grids };
}

/** Returns the band of each CONTENT_VIEW_PLANE_NAME grid of gridDtos (see gridContentViewBandName), undefined if not found. */
async function gridContentViewBandsLoad(request: Request, gridDtos: GridDto[]): Promise<(ContentBandDto | undefined)[]> {
  const bands = await contentViewBandLoad(request, gridDtos.map(gridContentViewBandName).filter((bandName): bandName is string => bandName !== undefined));
  return gridDtos.map((gridDto) => bands.find((band) => band.name === gridContentViewBandName(gridDto)));
}

/** The master values of a detail grid (see gridContentViewDetail). */
interface GridContentViewDetail {
  /** Only the DynamicDto rows the detail grid shows. */
  rowFilter: (dynamic: DynamicDto) => boolean;
  /** fieldNameDetail → master value, set on every row inserted by the detail grid (New); without the fields whose master grid has no row selected. */
  newValues: Record<string, string>;
}

/**
 * Returns the master values of the grid of band, a grid of the plane whose grids are gridDtos with their bands gridBands: for each Design Master Detail (of masterDetails)
 * whose detail band (DesignMasterDetailDto contentName and bandNameDetail) is band and whose master band (bandNameMaster) is the band of a grid of the plane, the
 * fieldNameMaster value of that master grid's selected row, loaded by id (dynamicLoadByIds of state.rowKeys[state.selectedRowIndex]), so it never outlives the selection.
 * The grid shows only the rows whose fieldNameDetail equals it (no rows if a master grid has no row selected) and sets it on its inserted rows. undefined (all rows) if
 * band is no such detail band.
 */
async function gridContentViewDetail(
  request: Request, masterDetails: DesignMasterDetailDto[], band: ContentBandDto, gridDtos: GridDto[], gridBands: (ContentBandDto | undefined)[],
): Promise<GridContentViewDetail | undefined> {
  // fieldNameDetail and its master value, undefined if the master grid has no row selected.
  const detailValues: [string, string | undefined][] = [];
  for (const bands of masterDetails.map(designMasterDetailBands)) {
    if (bands === undefined || bands.detailBandName !== band.name) {
      continue;
    }
    const { masterBandName, fieldNameMaster, fieldNameDetail } = bands;
    const masterGridDto = gridDtos[gridBands.findIndex((masterBand) => masterBand?.name === masterBandName)];
    if (masterGridDto === undefined) {
      continue;
    }
    const selectedRowIndex = masterGridDto.state?.selectedRowIndex;
    const rowKey = selectedRowIndex !== undefined ? masterGridDto.state?.rowKeys?.[selectedRowIndex] : undefined;
    const [masterDynamic] = rowKey !== undefined && rowKey !== '' ? await dynamicLoadByIds(request, [rowKey]) : [];
    detailValues.push([fieldNameDetail, masterDynamic !== undefined ? gridCellText(masterDynamic.values?.[fieldNameMaster], {}) : undefined]);
  }
  return detailValues.length > 0
    ? {
      rowFilter: (dynamic) => detailValues.every(([fieldNameDetail, value]) => value !== undefined && gridCellText(dynamic.values?.[fieldNameDetail], {}) === value),
      newValues: Object.fromEntries(detailValues.filter((detailValue): detailValue is [string, string] => detailValue[1] !== undefined)),
    }
    : undefined;
}

/**
 * Builds a content view grid from band: a Table as the Data grid of the "dynamic" plane with the rows of its TableName and a Column Chooser (without the columns hidden by
 * DesignBandColumnDto.isVisible), only its distinct rows (read only, no New) if its IsDistinct property is "true", a Form by gridContentFormLoad, both titled by
 * gridContentViewTitle, with only the rows of detail and its values on inserted rows (see gridContentViewDetail; all rows if undefined) and, if isMaster (band is the
 * master band of a Design Master Detail), with setting isSelectPatch; otherwise (or band not found) an empty grid.
 */
async function gridContentViewLoad(
  request: Request, gridDto: GridDto, band: ContentBandDto | undefined, isMaster: boolean, detail: GridContentViewDetail | undefined,
): Promise<GridDto> {
  // Replaces any incoming setting (gridDynamicDataLoad keeps gridDto's), so a grid whose band is no longer a master stops sending Select.
  const setting = isMaster ? { isSelectPatch: true } : undefined;
  if (band?.bandEnum === ContentBandEnum.Table) {
    const isDistinct = gridContentViewIsDistinct(band);
    const grid = await gridDynamicDataLoad(request, gridDto, gridContentViewTableName(band), detail?.rowFilter, detail?.newValues, true, band.hiddenColumnNames, isDistinct);
    // Distinct rows are read only, so no New either.
    return { ...grid, title: gridContentViewTitle(band), setting: isDistinct ? { ...setting, isNewHide: true } : setting };
  }
  if (band?.bandEnum === ContentBandEnum.Form) {
    return { ...await gridContentFormLoad(request, gridDto, band, detail), title: gridContentViewTitle(band), setting };
  }
  // custom is kept, so the grid is still built from its band on a later request.
  return { state: { custom: gridDto.state?.custom } };
}

/**
 * Patches the CONTENT_VIEW_PLANE_NAME plane's grids: GridCommandEnum.ColumnChooser of a Table band's grid opens the Column Chooser lookup (its TableName's columns),
 * GridCommandEnum.FilterMulti of a Table band's grid opens the Filter Multi lookup (distinct texts of its column, only
 * of the rows of its detail filter, see gridContentViewDetail); GridCommandEnum.Select of a master grid replaces its detail grids (see gridContentViewSelectPatch).
 */
export async function planeContentViewPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDtos = gridPlaneDto.grids ?? [];
  const grids: GridDto[] = [];
  for (const gridIndex of gridDtos.keys()) {
    grids.push(await gridContentViewPatch(request, gridDtos, gridIndex));
  }
  const selectIndex = gridDtos.findIndex((gridDto) => gridDto.command?.commandEnum === GridCommandEnum.Select);
  if (selectIndex !== -1) {
    for (const [gridIndex, grid] of await gridContentViewSelectPatch(request, gridDtos, selectIndex)) {
      grids[gridIndex] = { patches: [{ patchEnum: GridPatchEnum.Grid, grid } satisfies GridPatchDto] };
    }
  }
  return { ...gridPlaneDto, grids };
}

/** Returns the master bands (DesignBandDto.name) of masterDetails; their grids send GridCommandEnum.Select on a row change (isSelectPatch). */
function gridContentViewMasterBandNames(masterDetails: DesignMasterDetailDto[]): Set<string> {
  return new Set<string>(masterDetails.map(designMasterDetailBands).flatMap((bands) => bands !== undefined ? [bands.masterBandName] : []));
}

/**
 * Returns the detail grids (by grid index) of gridDtos[masterIndex], whose selected row changed (GridCommandEnum.Select), rebuilt with the detail filter of its new
 * selection (see gridContentViewDetail): the grids whose band is a detail band (bandNameDetail) of a Design Master Detail with the master grid's band as master band
 * (bandNameMaster), each starting on the first page with no selection, sort or filter (gridFsp then selects its first row). A rebuilt detail grid that is itself a master
 * grid rebuilds its own detail grids the same way, with its new selection.
 */
async function gridContentViewSelectPatch(request: Request, gridDtos: GridDto[], masterIndex: number): Promise<Map<number, GridDto>> {
  const gridBands = await gridContentViewBandsLoad(request, gridDtos);
  const masterDetails = await designMasterDetailLoad(request);
  const masterBandNames = gridContentViewMasterBandNames(masterDetails);
  // The plane's grids, the rebuilt ones replacing the incoming ones, so a detail grid's filter reads the new selection of its master grid.
  const gridDtosCurrent = [...gridDtos];
  const result = new Map<number, GridDto>();
  const masterIndexes = [masterIndex];
  for (const currentMasterIndex of masterIndexes) {
    const masterBand = gridBands[currentMasterIndex];
    if (masterBand === undefined) {
      continue;
    }
    const detailBandNames = new Set<string>(masterDetails
      .map(designMasterDetailBands)
      .filter((bands) => bands?.masterBandName === masterBand.name)
      .map((bands) => bands?.detailBandName ?? ''));
    for (const [gridIndex, band] of gridBands.entries()) {
      // A grid is rebuilt once (also against a cycle of Design Master Details); the selected grid itself keeps its rows.
      if (band === undefined || !detailBandNames.has(band.name) || gridIndex === masterIndex || result.has(gridIndex)) {
        continue;
      }
      // Other rows are shown: start on the first page with no selection, sort or filter, and drop the pending command, unsaved modifies and an open lookup.
      const gridDto = gridDtosCurrent[gridIndex];
      const gridDtoSelect: GridDto = {
        ...gridDto,
        command: undefined,
        modifies: undefined,
        planes: undefined,
        state: { ...gridDto.state, selectedRowIndex: undefined, selectedColumnName: undefined, isSelectedMulti: undefined, pageIndex: 0, sort: undefined, filters: undefined, filterMultis: undefined },
      };
      const detail = await gridContentViewDetail(request, masterDetails, band, gridDtosCurrent, gridBands);
      const grid = await gridContentViewLoad(request, gridDtoSelect, band, masterBandNames.has(band.name), detail);
      result.set(gridIndex, grid);
      gridDtosCurrent[gridIndex] = grid;
      masterIndexes.push(gridIndex);
    }
  }
  return result;
}

/** Patches gridDtos[gridIndex] (see planeContentViewPatch); gridDtos are all grids of the plane, for its detail filter. */
async function gridContentViewPatch(request: Request, gridDtos: GridDto[], gridIndex: number): Promise<GridDto> {
  const gridDto = gridDtos[gridIndex];
  const commandEnum = gridDto.command?.commandEnum;
  if ((commandEnum !== GridCommandEnum.FilterMulti && commandEnum !== GridCommandEnum.ColumnChooser) || gridContentViewBandName(gridDto) === undefined) {
    return {};
  }
  const gridBands = await gridContentViewBandsLoad(request, gridDtos);
  const band = gridBands[gridIndex];
  if (band?.bandEnum !== ContentBandEnum.Table) {
    return {};
  }
  if (commandEnum === GridCommandEnum.ColumnChooser) {
    const lookupPlane = await gridDynamicDataColumnChooserLoad(request, gridDto, gridContentViewTableName(band), band.hiddenColumnNames);
    return { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] };
  }
  const detail = await gridContentViewDetail(request, await designMasterDetailLoad(request), band, gridDtos, gridBands);
  const lookupPlane = await gridDynamicDataFilterMultiLoad(request, gridDto, gridContentViewTableName(band), detail?.rowFilter, band.hiddenColumnNames);
  return { patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] };
}

/**
 * Builds the grid of the Form band band: ColumnCount header columns (named A, B, C, ... by indexToColumnNameExcel) and RowCount rows (each cell the FieldName property
 * of that cell of band, "Cell" if missing or empty), each followed by a row of their values (a text box with the value of that FieldName of the DynamicDto row, the label
 * "Empty" if the cell has no FieldName), repeated for each DynamicDto row of the current page (every cell's rowIndex is that row's index on the page), the counts
 * clamped by designFormCount, followed by the bar (New, Save, Reload and pager). The pager pages the DynamicDto rows of the band's TableName (all rows if empty, like the
 * Data grid of the "dynamic" plane), only those of detail's rowFilter (all if undefined). Like the Debug Data grid (gridDataNew), New appends one empty form repetition
 * (isNew text boxes, rowIndex after the page's rows; a FieldName of detail's newValues a label with its master value instead), and Save writes the modified text boxes
 * into their DynamicDto rows and inserts the new repetitions as DynamicDto rows with that TableName and detail's newValues.
 */
async function gridContentFormLoad(request: Request, gridDto: GridDto, band: ContentBandDto, detail: GridContentViewDetail | undefined): Promise<GridDto> {
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
  // A new repetition (dynamic undefined) has empty isNew text boxes, like gridDataNew; a FieldName set by the master grid (detail's newValues) is a label with its value.
  const valueCell = (dynamic: DynamicDto | undefined, formRowIndex: number, columnName: string, rowIndex: number): GridCellDto => {
    const name = fieldName(formRowIndex, columnName);
    if (name === undefined) {
      return { cellEnum: GridCellEnum.Label, text: 'Empty', rowIndex, columnName, ...(dynamic === undefined && { isNew: true }) };
    }
    const newValue = detail?.newValues[name];
    if (dynamic === undefined && newValue !== undefined) {
      return { cellEnum: GridCellEnum.Label, text: newValue, rowIndex, columnName: name, isNew: true };
    }
    return dynamic !== undefined
      ? { cellEnum: GridCellEnum.Edit, text: gridCellText(dynamic.values?.[name], {}), rowIndex, columnName: name }
      : { cellEnum: GridCellEnum.Edit, placeHolder: 'New', rowIndex, columnName: name, isNew: true };
  };

  const tableName = gridContentViewTableName(band);

  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    const fieldNames = new Set(columnNames.flatMap((columnName) => Array.from({ length: rowCount }, (_, formRowIndex) => fieldName(formRowIndex, columnName) ?? []).flat()));
    // Only the form's FieldNames are saved, each a dynamic column (DynamicDto.values).
    const columns = [...fieldNames].map((name) => gridDynamicDataColumn(name));
    await dynamicUpdate(request, await gridDataSaveUpdate<DynamicDto>(request, 'DynamicDto', gridDto, columns));
    // New repetitions are inserted with tableName (none if undefined); the master values (detail's newValues) win over a modify of the same field, so the row is shown by the detail grid.
    const inserts = gridDataSaveInsert<DynamicDto>(gridDto, columns, () => (tableName !== undefined ? { tableName } : {}));
    await dynamicInsert(request, inserts.map((dynamic): DynamicDto => ({ ...dynamic, values: { ...dynamic.values, ...detail?.newValues } })));
  }

  const dynamics = (await dynamicLoad(request, tableName)).filter((dynamic) => detail?.rowFilter(dynamic) ?? true);
  // Filter-Sort-Page: no columns, so no filter or sort. Its selectedRowIndex (the first row of the page if none is selected) is the rowIndex of a form repetition.
  const { rows: pageDynamics, state: fspState } = gridFsp(dynamics, [], gridDto.state);

  // No columnName on the header cells: clicking them doesn't sort and they have no filter button.
  const headerRow: GridRowDto = { cells: columnNames.map((columnName) => gridHeaderCell(undefined, undefined, columnName)) };
  // One form repetition: each form row renders as two rows, its FieldNames ("Cell" if missing), then their values; all its cells get rowIndex
  // (so the whole repetition is selected together).
  const repetitionRows = (dynamic: DynamicDto | undefined, rowIndex: number): GridRowDto[] => Array.from({ length: rowCount }, (_, formRowIndex) => [
    { cells: columnNames.map((columnName): GridCellDto => ({ cellEnum: GridCellEnum.Label, text: fieldName(formRowIndex, columnName) ?? 'Cell', rowIndex, columnName, ...(dynamic === undefined && { isNew: true }) })) },
    { cells: columnNames.map((columnName) => valueCell(dynamic, formRowIndex, columnName, rowIndex)) },
  ]).flat();
  // The form is repeated for each dynamic row of the page (rowIndex its index on the page); New appends one empty repetition with rowIndex after them.
  const rows: GridRowDto[] = [
    ...pageDynamics.flatMap((dynamic, rowIndex) => repetitionRows(dynamic, rowIndex)),
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
