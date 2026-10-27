import { GridCellDto, GridCellEnum, GridCommandEnum, GridDto, GridPatchDto, GridPatchEnum, GridPlaneDto, GridRowDto } from '../dto/shared/grid-dto.js';
import { schemaLoad, schemaLoadByIds, schemaUpdate, schemaInsert } from '../util/util-schema.js';
import { SchemaDto } from '../dto/schema-dto.js';
import { GridConfigColumnDto, GridConfigTypeEnum, GridConfigDto } from '../dto/grid-config-dto.js';
import { gridBarRow, gridCellText, gridCellValue, gridColumns, gridFilterMultiLoad, gridFilterMultiOk, gridFindRow, gridFsp, gridHeaderCell, gridLookupSet, gridTables } from '../util/util-grid.js';

const SCHEMA_COLUMNS: GridConfigDto = {
  columns: (['tableName', 'columnName'] as const satisfies readonly (keyof SchemaDto)[]).map(
    (columnName): GridConfigColumnDto => ({ columnName, typeEnum: GridConfigTypeEnum.Text }),
  ),
};

/** Loads the "schema" plane: the schema grid (GridPlaneDto.grids[0]). */
export async function planeSchemaLoad(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.Save) {
    await gridSchemaSaveUpdate(request, gridDto);
    await gridSchemaSaveInsert(request, gridDto);
  }

  const allSchemas = await schemaLoad(request);

  // Filter Multi Ok: apply the chosen texts (GridStateDto.filterMultis) before the rows are built.
  gridFilterMultiOk(gridDto, SCHEMA_COLUMNS.columns ?? [], allSchemas);

  // Filter-Sort-Page: schemas holds only the rows of the current page.
  const { rows: schemas, state: fspState } = gridFsp(allSchemas, SCHEMA_COLUMNS.columns ?? [], gridDto.state);

  const headerRow: GridRowDto = {
    cells: gridColumns(SCHEMA_COLUMNS.columns ?? []).map((column) => gridHeaderCell(column.columnName, gridDto.state?.sort)),
  };
  const rows: GridRowDto[] = schemas.map((schema, rowIndex) => ({
    cells: gridColumns(SCHEMA_COLUMNS.columns ?? []).map(
      (column): GridCellDto => ({
        cellEnum: GridCellEnum.Edit,
        text: gridCellText(schema[column.columnName as keyof SchemaDto], column),
        rowIndex,
        columnName: column.columnName,
      }),
    ),
  }));

  // rowKey is the _id (ObjectId hex), since name ("{tableName}.{columnName}") changes when a row is edited.
  const rowKeys: string[] = schemas.map((schema) => schema._id?.toHexString() ?? '');
  const findRow = gridFindRow(gridColumns(SCHEMA_COLUMNS.columns ?? []).map((column) => column.columnName));

  const result: GridDto = {
    ...gridDto,
    title: 'Schema',
    tables: gridTables([], [headerRow, findRow, ...rows], [gridBarRow()]),
    state: { ...gridDto.state, ...fspState, rowKeys },
  };

  if (gridDto.command?.commandEnum === GridCommandEnum.New) {
    gridSchemaNew(result);
  }

  // Lookup (planes[0]): Filter Multi (opened by planeSchemaPatch, kept open while planes[0].planeName is filterMulti).
  gridLookupSet(result, gridFilterMultiLoad(gridDto, SCHEMA_COLUMNS.columns ?? [], allSchemas));

  // Command is transient: clear it so it isn't re-processed on a later request.
  result.command = undefined;

  return { ...gridPlaneDto, grids: [result] };
}

/** Patches the "schema" plane's schema grid (GridPlaneDto.grids[0]): GridCommandEnum.FilterMulti opens the Filter Multi lookup (distinct texts of its column). */
export async function planeSchemaPatch(request: Request, gridPlaneDto: GridPlaneDto): Promise<GridPlaneDto> {
  const gridDto = gridPlaneDto.grids?.[0] ?? {};
  if (gridDto.command?.commandEnum === GridCommandEnum.FilterMulti) {
    const lookupPlane = gridFilterMultiLoad(gridDto, SCHEMA_COLUMNS.columns ?? [], await schemaLoad(request));
    return { ...gridPlaneDto, grids: [{ patches: [{ patchEnum: GridPatchEnum.Lookup, planeName: lookupPlane?.planeName, lookup: lookupPlane?.grids?.[0] } satisfies GridPatchDto] }] };
  }
  return { ...gridPlaneDto, grids: [{}] };
}

async function gridSchemaSaveUpdate(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => !modify.isNew);
  const rowKeys = gridDto.state?.rowKeys ?? [];

  const ids = [
    ...new Set(
      modifies
        .map((modify) => (modify.rowIndex !== undefined ? rowKeys[modify.rowIndex] : undefined))
        .filter((rowKey): rowKey is string => rowKey !== undefined),
    ),
  ];

  const schemas = await schemaLoadByIds(request, ids);

  const columns = gridColumns(SCHEMA_COLUMNS.columns ?? []);

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const rowKey = rowKeys[modify.rowIndex];
    const schema = schemas.find((schema) => schema._id?.toHexString() === rowKey);
    if (schema) {
      (schema as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    }
  }

  await schemaUpdate(request, schemas);
}

async function gridSchemaSaveInsert(request: Request, gridDto: GridDto): Promise<void> {
  const modifies = (gridDto.modifies ?? []).filter((modify) => modify.isNew);

  const columns = gridColumns(SCHEMA_COLUMNS.columns ?? []);

  const schemasByRowIndex = new Map<number, SchemaDto>();

  for (const modify of modifies) {
    const column = columns.find((column) => column.columnName === modify.columnName);
    if (modify.rowIndex === undefined || modify.columnName === undefined || modify.cellEnum !== GridCellEnum.Edit || column === undefined) {
      continue;
    }

    const schema = schemasByRowIndex.get(modify.rowIndex) ?? { tableName: '', columnName: '' };
    (schema as unknown as Record<string, unknown>)[modify.columnName] = gridCellValue(modify.textModified, column);
    schemasByRowIndex.set(modify.rowIndex, schema);
  }

  await schemaInsert(request, [...schemasByRowIndex.values()]);
}

/** Appends one empty, editable new row to the data table (GridDto.tables[1]). */
function gridSchemaNew(gridDto: GridDto): void {
  const dataTable = gridDto.tables?.[1];
  if (dataTable === undefined) {
    return;
  }
  const rows = dataTable.rows ?? [];
  const rowIndex = rows.length;

  const newRow: GridRowDto = {
    cells: gridColumns(SCHEMA_COLUMNS.columns ?? []).map(
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
